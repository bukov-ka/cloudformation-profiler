import {
  CloudFormationClient,
  DescribeStackEventsCommand,
  StackEvent,
} from "@aws-sdk/client-cloudformation";
import { fromIni } from "@aws-sdk/credential-providers";
import * as process from "process";

interface ResourceDeploymentTime {
  resourceId: string;
  resourceType: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
}

async function getStackEvents(
  stackName: string,
  profile: string,
  region: string
): Promise<StackEvent[]> {
  const client = new CloudFormationClient({
    region,
    credentials: fromIni({ profile }),
  });

  try {
    const command = new DescribeStackEventsCommand({ StackName: stackName });
    const response = await client.send(command);
    return response.StackEvents || [];
  } catch (error) {
    console.error("Error fetching stack events:", error);
    return [];
  }
}

function filterEventsForLatestUpdate(
  events: StackEvent[],
  stackName: string
): StackEvent[] {
  // Sort events by timestamp in descending order (newest first)
  const sortedEvents = [...events].sort(
    (a, b) =>
      new Date(b.Timestamp!).getTime() - new Date(a.Timestamp!).getTime()
  );

  // Find the first "User Initiated" update event in the sorted list
  const latestUpdateIndex = sortedEvents.findIndex(
    (event) =>
      (event.ResourceStatus === "UPDATE_IN_PROGRESS" ||
        event.ResourceStatus === "CREATE_IN_PROGRESS") &&
      event.ResourceStatusReason === "User Initiated" &&
      event.ResourceType === "AWS::CloudFormation::Stack" &&
      event.StackName === stackName
  );

  if (latestUpdateIndex === -1) {
    console.error("No recent 'User Initiated' update found for the stack.");
    return [];
  }
  // Return events up to the latest update (since the list is sorted descending)
  return sortedEvents.slice(0, latestUpdateIndex + 1).reverse();
  // Reverse to maintain chronological order
}
function calculateDeploymentTimes(
  events: StackEvent[]
): ResourceDeploymentTime[] {
  const deploymentTimes: ResourceDeploymentTime[] = [];
  const resourceStartTimes: Record<string, Date> = {};

  // Process events in chronological order
  events.forEach((event) => {
    const resourceKey = `${event.LogicalResourceId}-${event.ResourceType}`;
    const timestamp = new Date(event.Timestamp!);

    if (
      event.ResourceStatus === "CREATE_IN_PROGRESS" ||
      event.ResourceStatus === "UPDATE_IN_PROGRESS"
    ) {
      // Only set start time if we haven't seen this resource yet
      if (!resourceStartTimes[resourceKey]) {
        resourceStartTimes[resourceKey] = timestamp;
      }
    } else if (
      (event.ResourceStatus === "CREATE_COMPLETE" ||
        event.ResourceStatus === "UPDATE_COMPLETE") &&
      resourceStartTimes[resourceKey]
    ) {
      const startTime = resourceStartTimes[resourceKey];
      const durationSeconds =
        (timestamp.getTime() - startTime.getTime()) / 1000;

      if (durationSeconds > 0) {
        deploymentTimes.push({
          resourceId: event.LogicalResourceId ?? "UnknownResource",
          resourceType: event.ResourceType ?? "UnknownType",
          startTime,
          endTime: timestamp,
          durationSeconds,
        });
      }
      // Clear the start time after processing delete resourceStartTimes[resourceKey];
    }
  });

  // Sort by duration in descending order
  return deploymentTimes.sort((a, b) => b.durationSeconds - a.durationSeconds);
}

async function main() {
  const stackName = process.argv[2];
  const profile = process.argv[3];
  const region = process.argv[4] || "us-east-1";

  if (!stackName || !profile) {
    console.error(
      "Usage: ts-node cf-profiler.ts <stack-name> <aws-profile> [region]"
    );
    process.exit(1);
  }

  console.log(`Analyzing stack: ${stackName}`);

  const stackEvents = await getStackEvents(stackName, profile, region);
  const latestUpdateEvents = filterEventsForLatestUpdate(
    stackEvents,
    stackName
  );

  if (latestUpdateEvents.length === 0) {
    console.error("No events found for analysis");
    process.exit(1);
  }

  const deploymentTimes = calculateDeploymentTimes(latestUpdateEvents);

  if (deploymentTimes.length === 0) {
    console.log("No completed resource updates found in the latest deployment");
    process.exit(0);
  }

  console.log("\nResource deployment times (sorted by duration):\n");
  deploymentTimes.forEach((resource) => {
    console.log(`Resource: ${resource.resourceId} (${resource.resourceType})`);
    console.log(`Start Time: ${resource.startTime.toISOString()}`);
    console.log(`End Time: ${resource.endTime.toISOString()}`);
    console.log(`Duration: ${resource.durationSeconds.toFixed(2)} seconds\n`);
  });
}

main();
