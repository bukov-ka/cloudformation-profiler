# CloudFormation Stack Profiler

A TypeScript utility that analyzes AWS CloudFormation stack events to provide detailed deployment timing information for each resource. This tool helps identify bottlenecks in your CloudFormation deployments by showing how long each resource takes to create or update.

## Features

- Analyzes the most recent stack update or creation
- Provides detailed timing information for each resource deployment
- Sorts resources by deployment duration
- Supports custom AWS profiles and regions
- Shows start time, end time, and duration for each resource
- Handles both stack creation and update events

## Prerequisites

- Node.js (v14 or later recommended)
- TypeScript
- AWS credentials configured in your AWS credentials file
- Required npm packages:
  - `@aws-sdk/client-cloudformation`
  - `@aws-sdk/credential-providers`

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Usage

Run the script using ts-node:

```bash
ts-node index.ts <stack-name> <aws-profile> [region]
```

### Parameters

- `stack-name` (required): Name of the CloudFormation stack to analyze
- `aws-profile` (required): AWS profile to use for authentication
- `region` (optional): AWS region where the stack is deployed (defaults to us-east-1)

### Example

```bash
ts-node index.ts my-application-stack dev-profile us-west-2
```

## Output

The script outputs deployment information for each resource in the following format:

```
Resource: MyEC2Instance (AWS::EC2::Instance)
Start Time: 2024-12-29T10:00:00.000Z
End Time: 2024-12-29T10:03:30.000Z
Duration: 210.00 seconds
```

Resources are sorted by duration in descending order, making it easy to identify which resources took the longest to deploy.

## How It Works

1. Fetches all events for the specified CloudFormation stack
2. Identifies the most recent user-initiated stack update or creation
3. Analyzes the deployment time for each resource by:
   - Tracking CREATE_IN_PROGRESS/UPDATE_IN_PROGRESS events as start times
   - Matching with corresponding CREATE_COMPLETE/UPDATE_COMPLETE events
   - Calculating the duration between start and completion
4. Sorts resources by deployment duration
5. Outputs the results in a human-readable format

## Error Handling

The script includes error handling for common scenarios:
- Missing required parameters
- AWS API errors
- No recent user-initiated updates found
- No completed resource updates in the latest deployment

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Konstantin Borisov borisovke@gmail.com