const express = require('express');
const app = express();

function msleep(n) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}
function sleep(n) {
  msleep(n*1000);
}


// opencensus setup
const projectId = 'stack-doctor';
const {globalStats, MeasureUnit, AggregationType} = require('@opencensus/core');
const {StackdriverStatsExporter} = require('@opencensus/exporter-stackdriver');

// Stackdriver export interval is 60 seconds
const EXPORT_INTERVAL = 60;

// define the "golden signals" metrics and views
// request count measure
const REQUEST_COUNT = globalStats.createMeasureInt64(
    'request_count',
    MeasureUnit.UNIT,
    'Number of requests to the server'
);
// request count view
const request_count_metric = globalStats.createView(
    'request_count_metric',
    REQUEST_COUNT,
    AggregationType.COUNT
);
globalStats.registerView(request_count_metric);

// error count measure
const ERROR_COUNT = globalStats.createMeasureInt64(
    'error_count',
    MeasureUnit.UNIT,
    'Number of failed requests to the server'
);
// error count view
const error_count_metric = globalStats.createView(
    'error_count_metric',
    ERROR_COUNT,
    AggregationType.COUNT
);
globalStats.registerView(error_count_metric);

// set up the Stackdriver exporter - hardcoding the project is bad!
// GOOGLE_APPLICATION_CREDENTIALS are expected by a dependency of this code
// Not this code itself. Checking for existence here but not retaining (as not needed)
if (!projectId || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // throw Error('Unable to proceed without a Project ID');
}
const exporter = new StackdriverStatsExporter({
  projectId: projectId,
  period: EXPORT_INTERVAL * 1000,
});
globalStats.registerExporter(exporter);


app.get('/', (req, res) => {

  // desired error rate
  let ERROR_RATE = 0;
  if (process.env.ERROR_RATE) {
    ERROR_RATE = process.env.ERROR_RATE;
  }
  else {
    // 99% available by default
    ERROR_RATE = 1;
  }
    
  console.log("request made");

  // record a request count for every request
  globalStats.record([
      {
        measure: REQUEST_COUNT,
        value: 1,
      },
    ]);
  
  // throw an error based on desired error rate
  var randomValue = Math.floor(Math.random() * Math.floor(100));
  if (randomValue <= ERROR_RATE){
    // record a failed request
    globalStats.record([
      {
        measure: ERROR_COUNT,
        value: 1,
      },
    ]);

    // return error
    res.status(500).send("failure");
  }

  else {
    // sleep for a bit
    randomValue = Math.floor(Math.random() * (9) + 1);
    sleep(randomValue/10);

    // return success
    res.status(200).send("success after waiting for " + randomValue/10 + " seconds");
    }
})


app.listen(8080, () => console.log(`Example app listening on port 8080!`))