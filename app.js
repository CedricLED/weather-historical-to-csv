var rows = [];
const async = require('async');
const fs = require('fs');
const path = require('path');
const csv = require('csvtojson');
const {
  Parser,
} = require('json2csv');
const fields = ['City', 'State', 'Date', 'maxTemp', 'minTemp', 'precip', 'precipType'];
const json2csvParser = new Parser({
  fields,
});
const config = JSON.parse(fs.readFileSync(path.join(path.dirname(process.execPath), 'config.json')));
const m = require('moment');
const momentRange = require('moment-range');
const request = require('request-promise-native');

const moment = momentRange.extendMoment(m);

const start = moment(config.fromDate, 'YYYY-MM-DD');
const end = moment(config.toDate, 'YYYY-MM-DD');

const range = moment.range(start, end);

csv()
    .fromFile('locations.csv')
    .then((locations) => {
      async.each(range.by('day'), function(day, callback) {
        day.format('YYYY-MM-DD');
        async.each(locations, function(location, callback) {
          const options = {
            uri: `https://api.darksky.net/forecast/${config.key}/${location.Latitude},${location.Longitude},${day.unix()}?exclude=currently,flags,hourly,minutely,alerts&units=si`,
            json: true, // Automatically parses the JSON string in the response
          };
          request(options).then(function(response) {
            rows.push({
              'City': location.City,
              'State': location.State,
              'Date': day.toJSON().substring(0, 10),
              'maxTemp': response.daily.data[0].temperatureMax,
              'minTemp': response.daily.data[0].temperatureMin,
              'precip': (response.daily.data[0].precipIntensity * 24 || 0).toFixed(3),
              'precipType': response.daily.data[0].precipType,
            });
            callback();
          }).catch(function(err) {
            console.log(err);
            callback();
          });
        }, function(err) {
          callback();
        });
      }, function(err) {
        const csv = json2csvParser.parse(rows.sort((a, b) => (a.city > b.city) ? 1 : (a.city === b.city) ? ((a.date > b.date) ? 1 : -1) : -1));
        fs.writeFile('./test.csv', csv, function(err) {
          if (err) {
            return console.log(err);
          }

          console.log('The file was saved!');
        });
      });
    });
