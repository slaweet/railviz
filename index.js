#!/usr/bin/env node
var program = require('commander');
var request = require('request');
var cheerio = require('cheerio');
var jsonfile = require('jsonfile');
var fs = require('fs');
var cachedRequest = require('cached-request')(request);
var cacheDirectory = "/tmp/cache";
cachedRequest.setCacheDirectory(cacheDirectory);
var server = 'http://www.zelpage.cz/';


function compareStops(a,b) {
  var aArrival = (a.arrival || a.departure);
  var bArrival = (b.arrival || b.departure);
  if (aArrival < bArrival) {
    return -1;
  } else if (aArrival > bArrival) {
    return 1;
  }
  return 0;
}

function sortStops(train) {
  train.stops.sort(compareStops);
  if (train.stops.length > 1 && train.stops[0].departure.substr(1) === '0' && train.stops[train.stops.length - 1].departure.substr(1) === '2') {

  }
}
 
function getTime(elem, i) {
  var time = elem.find('td:nth-child(' + i + ')').text().trim();
  if (time.length === '1:00'.length) {
    time = '0' + time;
  }
  return time;
}
 
function processTrains(stations, callback) {
  console.log("Processing trains");
  var itemsProcessed = 0;
  var trains = {};
  stations.forEach(function(station) {
    cachedRequest({url: server + station.timetableLink}, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var $ = cheerio.load(body);
        $('table tr.text_raz').each(function(i, elem) {
          var id = $(elem).find('td:nth-child(3)').text().trim();
          var train = trains[id] || {
            id : id,
            stops : [],
          };
          if (station.id === 'cadca' && id.indexOf(' ') === -1) {
            //pass
          } else {
            train.stops.push({
              arrival : getTime($(elem), 1),
              departure : getTime($(elem), 2),
              station : station.id,
              note : $(elem).find('td:nth-child(6)').text().trim(),
            });
            station.trains = station.trains || [];
            station.trains.push(train.id);
          }
          trains[train.id] = train;
        });
      }
      itemsProcessed++;
      if(itemsProcessed === stations.length) {
        var file = './static/data/trains.json';
        var trainsArray = [];

        for (var i in trains) {
          sortStops(trains[i]);
          if (trains[i].stops[0] && !trains[i].stops[0].arrival) {
            // TODO  don't filter trains over midnight
            trainsArray.push(trains[i]);
          }
        }
        console.log(trainsArray.length, "trains writen to file", file);
        jsonfile.writeFile(file, trainsArray, function (err) {
            console.error(err);
        });
        processLines(trainsArray);
        callback();
      }
    });
  });
}

function processStations(stations) {
  console.log("Processing stations");
  var itemsProcessed = 0;
  stations.forEach(function(station) {
    cachedRequest({url: server + station.link}, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var $ = cheerio.load(body);
        station.title = $('.titulek_raz strong').text();
        station.timetableLink = station.link.replace('/stanice/', '/odjezdy-2016/');
        $('script').each(function(i, linkElem) {
          var text = $(linkElem).text();
          if (text.indexOf('LatLng') !== -1) {
            var latLng = text.match(/LatLng\((\d+.\d+), (\d+.\d+)/);
            if (latLng) {
              station.lat = parseFloat(latLng[1]);
              station.lon = parseFloat(latLng[2]);

            } else {
              console.error('No latLng in station', station);
            }
          }
        });
      }
      itemsProcessed++;
      if(itemsProcessed === stations.length) {
        stations = stations.sort(function(a, b) {
          return (a.trains || []).length - (b.trains || []).length;
        });
        processTrains(stations, function() {
          var file = './static/data/stations.json';
          console.log(stations.length, "stations writen to file", file);
          jsonfile.writeFile(file, stations, function (err) {
              console.error(err);
          });
        });
      }
    });
  });
}

function findLines(trains) {
  var lines = [];
  var linesDict = {};
  trains.forEach(function(train) {
    var name = train.stops[0].station + ' - ' + train.stops[train.stops.length - 1].station;
    var id = name + train.stops.length;
    var name2 = train.stops[train.stops.length - 1].station + ' - ' + train.stops[0].station;
    var id2 = name2 + train.stops.length;
    if (linesDict[id2]) {
      id = id2;
      name = name2;
    }
    name = (train.id.split(/\s/).length > 1 ? train.id.split(/\s/)[0] : 'Os') + ' ' + name;
    var line = linesDict[id] || {
      trains : [],
      id : id,
      name : name,
      stops : train.stops.map(function(s) {return {station : s.station};}),
    };
    line.trains.push(train.id);
    linesDict[id] = line;

  });
  for (var i in linesDict) {
    lines.push(linesDict[i]);
  }

  return lines;
}

function processTracks(trackLinks) {
  console.log("Processing tracks");
  var stationLinks = [];
  var stations = [];
  var itemsProcessed = 0;
  trackLinks.forEach(function(link) {
    cachedRequest({url: server + link}, function (error, response, body) {
      var $ = cheerio.load(body);
      $('table td a[href^="/stanice/"]').each(function(i, linkElem) {
        var link = $(linkElem).attr('href');
        if (stationLinks.indexOf(link) === -1 && stationLinks.length < 50000) {
          stationLinks.push(link);
          stations.push({
            id: link.replace('/stanice/', '').replace('.html', ''),
            link: link,
          });
        }
      });
      itemsProcessed++;
      if(itemsProcessed === trackLinks.length) {
        processStations(stations);
      }
    });

  });
}

function processLines(trains) {
  console.log("Processing lines");
  var lines = findLines(trains);
  var linesFile = './static/data/lines.json';
  console.log("Lines found: ", lines.length);
  jsonfile.writeFile(linesFile, lines, function (err) {
      console.error(err);
  });
}

program
  .version('0.0.0')
  .command('scrape [optional]')
  .description('command description')
  .option('-o, --option','we can still have add l options')
  .action(function(req, optional){
    cachedRequest({url: server + 'trate/ceska-republika'}, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var $ = cheerio.load(body);
        var trackLinks = [];
        $('table.seznam td a[href^="trate"]').each(function(i, linkElem) {
          trackLinks.push($(linkElem).attr('href'));
        });
        processTracks(trackLinks);
      }
    });
  });
program
  .command('lines')
  .description('command description')
  .action(function(req, optional){
    var file = './static/data/trains.json';
    jsonfile.readFile(file, function(err, trains) {
      processLines(trains);
    });
  });

program.parse(process.argv);
