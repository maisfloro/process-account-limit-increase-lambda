# process-account-limit-increase-lambda

Lambda function that reads a csv file from S3 and publishes messages to an Amazon SNS topic

The messages are as follows:

```js
{
  contract: "tecnocom contract",
  status: "status message that indicates if the account limit increase was successful or not",
  details: "string that gives details about the processing, e.g. error message",
}
````

The SNS topic is called: `process-account-limit-increase`