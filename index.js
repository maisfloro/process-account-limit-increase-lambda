const AWS = require('aws-sdk');
const csv = require('csv-parser');

const topics = {
  accountLimitIncreaseProcessed: process.env.ACCOUNT_LIMIT_INCREASE_PROCESSED,
};

const S3 = new AWS.S3();
const SNS = new AWS.SNS();


/**
 * Publishes the file into SQS to be processed
 * @param {Object} csvList Array with each registry
 * @param {string} topic Topic name in which will be publish
 */
const publishMessage = async (csvList, topic) => {
  const eventsToPublish = [];
  csvList.map((row) => {
    const message = JSON.stringify({
      contract: String(row.contract),
      status: String(row.status),
      details: String(row.details),
    });

    const params = {
      TopicArn: topic,
      Message: message,
    };
    return eventsToPublish.push(SNS.publish(params).promise());
  });
  await Promise.all(eventsToPublish);
};

/**
 * Trims the values contained in the columns
 * @param {string} value The value contained in the column
 */
const mapCsvValues = ({ value }) => value.trim();

/**
 * Process the csv by building an object with the data stored in it
 * @param {string} bucket The S3 bucket identifier
 * @param {string} key The filename
 */
const processCsv = async (bucket, key) => new Promise((resolve, reject) => {
  const csvList = [];

  S3.getObject({ Bucket: bucket, Key: key })
    .createReadStream()
    .pipe(csv({
      separator: ',',
      mapValues: mapCsvValues,
      headers: ['contract', 'status', 'details'],
    }))
    .on('data', (data) => {
      csvList.push(data);
    })
    .on('end', async () => {
      console.log(`Preparing to publish ${csvList.length} events`);
      await publishMessage(csvList, topics.accountLimitIncreaseProcessed, key);
      resolve(csvList);
    })
    .on('error', (error) => {
      console.log(error);
      reject(error);
    });
});

exports.handler = async (event) => {
  const sourceBucket = event.Records[0].s3.bucket.name;
  const sourceKey = event.Records[0].s3.object.key;

  return processCsv(sourceBucket, sourceKey);
};
