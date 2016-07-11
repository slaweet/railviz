
var Processor = (function() {
  return {
    process : function(n) {
      n = this.makeDicts(n);
      n = this.stationTerminus(n);
      n = this.stationPositions(n);
      n = this.stationSize(n);
      n = this.makeGrid(n);
      n = this.smoothLines(n);
      n = this.smoothLines(n);
      n = this.trainColor(n);
      n = this.lineColor(n);
      n = this.lineWidth(n);
      n = this.linePaths(n);
      n = this.draw(n);
      return n;
    },
    makeGrid : function(n) {
      n.cellSize = 20;
      n.grid = new Array(Math.ceil(n.width / n.cellSize) + 1);
      for (var i = 0; i < n.grid.length; i++) {
        n.grid[i] = new Array(Math.ceil(n.height / n.cellSize));
      }
        
      n.stations.forEach(function(s) {
        s.gridX = Math.round(s.x / n.cellSize) * n.cellSize;
        s.gridY = Math.round(s.y / n.cellSize) * n.cellSize;
        var cellMax = n.grid[s.gridX / n.cellSize][s.gridY / n.cellSize];
        if (!cellMax) {
          cellMax = s;
        } else if (cellMax.size < s.size) {
          // console.log(cellMax);
          cellMax.hide = true;
          cellMax = s;
        }
        n.grid[s.gridX / n.cellSize][s.gridY / n.cellSize] = cellMax;
      });
      // console.log(n.stations.map(function(s) {return s.title + s.hide;}).join(' # '));
      return n;
    },
    smoothLines : function(n) {
      n.lines.forEach(function(line) {
        var stops = line.stops;
        for (var i = 0; i < stops.length; i++) {
          var prev = stops[i - 1];
          var next = stops[i + 1];
          if (next && next.station && next.station.title === "Moravské Budějovice žst") {
            //console.log(prev, stops[i], next);
          }
          if (prev && next && prev.station && next.station && stops[i].station && !stops[i].station.terminus) {
            if (prev.station.gridX === next.station.gridX &&
                prev.station.gridX !== stops[i].station.gridX) {
              stops[i].station.gridX = prev.station.gridX;
              //console.log("Move station", stops[i].station.title);
            }
            if (prev.station.gridY === next.station.gridY &&
                prev.station.gridY !== stops[i].station.gridY) {
              stops[i].station.gridY = prev.station.gridY;
              //console.log("Move station", stops[i].station.title);
            }
            if (prev.station.gridY === stops[i].station.gridY &&
                next.station.gridX === stops[i].station.gridX) {
              stops[i].station.gridX = prev.station.gridX;
              //console.log("Move station", stops[i].station.title);
            }
            if (next.station.gridY === stops[i].station.gridY &&
                prev.station.gridX === stops[i].station.gridX) {
              stops[i].station.gridX = next.station.gridX;
              //console.log("Move station", stops[i].station.title);
            }
          }
        }
        
      });
      return n;
    },
    makeDicts : function(n) {
      n.trainsDict = {};
      n.trains.forEach(function(t) {
        n.trainsDict[t.id] = t;
      });
      n.stationsDict = {};
      n.stations.forEach(function(s) {
        n.stationsDict[s.id] = s;
      });
      n.lines = n.lines.map(function(line) {
        line.stops = line.stops || [];
        line.stops = line.stops.map(function(stop) {
          stop.station = n.stationsDict[stop.station];
          return stop;
        });
        line.trains = line.trains.map(function(train) {
          return n.trainsDict[train];
        });
        return line;
      });
      return n;
    },
    stationTerminus : function(n) {
      n.lines.forEach(function(line) {
        if (line.stops[0]) {
          line.stops[0].station.terminus = true;
          line.stops[line.stops.length - 1].station.terminus = true;
        }
      });
      return n;
    },
    stationPositions : function(n) {
      n.lonLatBBox = {
        x : Math.min.apply(null, n.stations.map(function(s) {return s.lon;})),
        y : Math.min.apply(null, n.stations.map(function(s) {return s.lat;})),
        x2 : Math.max.apply(null, n.stations.map(function(s) {return s.lon;})),
        y2 : Math.max.apply(null, n.stations.map(function(s) {return s.lat;})),
      };
      n.lonLatBBox.width = n.lonLatBBox.x2 - n.lonLatBBox.x;
      n.lonLatBBox.height = n.lonLatBBox.y2 - n.lonLatBBox.y;
      n.xRatio = n.width / n.lonLatBBox.width;
      n.yRatio = n.height / n.lonLatBBox.height;
      n.zoomRatio = Math.min(n.xRatio, n.yRatio);

      n.stations.forEach(function(station) {
        station.x = (station.lon - n.lonLatBBox.x) * n.zoomRatio;
        station.y = n.height - 20 - (station.lat - n.lonLatBBox.y) * n.zoomRatio;
      });
      return n;
    },
    stationSize : function(n) {
      n.stations.forEach(function(station) {
        station.trains = station.trains || [];
        station.size = 4 + (station.trains.length || 0) / 50;
        station.showLabel = station.trains.length > 60 && station.terminus;
      });
      n.stations = n.stations.sort(function(a, b) {
        return a.trains.length - b.trains.length;
      });
      return n;
    },
    trainColor : function(n) {
      n.trains.forEach(function(train) {
        var colors = {
          'R': 'red',
          'Rx': 'red',
          'Sp': 'blue',
          'IC': 'green',
          'EC': 'green',
          'Ex': 'green',
          'LE': 'green',
          'RJ': 'green',
          'SuperCity': 'green',
        };
        train.color = 'black';
        for (var i in colors) {
          train.color = (train.id.indexOf(i) === -1) ? train.color : colors[i];
        }
      });
      return n;
    },
    lineColor : function(n) {
      var colors = [
        '#b06011',
        '#ee3224',
        '#ffd200',
        '#00853f',
        '#97005e',
        '#1c3f94',
        '#009ddc',
        '#86cebc',
        '#f386a1',
        '#231f20',
        '#f58025',
        '#939ba1',
      ];
      n.lines.forEach(function(line, i) {
        line.trains = line.trains || [];
        var train = n.trainsDict[line.trains[0]];
        line.color =  train && train.color;
        line.color = colors[i % colors.length];
      });
      return n;
    },
    lineWidth: function(n) {
      n.lines.forEach(function(line) {
        line.width = 4 + line.trains.length / 5;
      });
      return n;
    },
    linePaths : function(n) {
      n.lines.forEach(function(line) {
        line.stops = line.stops || [];
        line.path = "M" + line.stops.filter(function(stop) {
          var station = stop.station;
          return station && station.x && !station.hide && station.terminus;
        }).map(function(stop, i, stops) {
          var prev = stops[i - 1];
          var next = stops[i + 1];
          var station = stop.station;
          return station && (station.gridX + ',' + station.gridY);
        }).join(' L');
      });
      return n;
    },
    draw : function(n) {
      n = this.drawLines(n);
      n = this.drawStations(n);
      return n;
    },
    drawLines : function(n) {
      var that = this;
      n.lines.forEach(function(line) {
        if (line.path !== 'M') {
          line.elem = n.paper.path(line.path);
          line.elem.attr({
            'stroke-width' : line.width,
            'title': line.name + ' ' + line.trains.length + 'krát denně',
            'stroke': line.color,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'cursor': 'pointer',
          });
          line.elem.click(function() {
            that.showTimetable(n, line);
            console.log(line.id, line.stops.map(function(s) {return s.station;}).join(' -> '));
          });
          line.elem.hover(function() {
            line.elem.attr({
              'stroke': chroma(line.color).darken().darken(),
            });
            line.stops.forEach(function(stop) {
              if (stop.station.elem) {
                stop.station.elem.attr({
                  'fill': chroma('white').darken().darken(),
                });
              }
            });
          }, function() {
            line.elem.attr({
              'stroke': line.color,
            });
            line.stops.forEach(function(stop) {
              if (stop.station.elem) {
                stop.station.elem.attr({
                  'fill': 'white',
                });
              }
            });
          });
        }
      });
      return n;
    },
    showTimetable : function(n, line) {

      var rows = line.stops.map(function(t) {
        return [t.station.title];
      });
      rows = [['']].concat(rows);
      for (var i = 0; i < line.trains.length; i++) {
          rows[0].push(line.trains[i].id);
        for (var j = 0; j < line.trains[i].stops.length; j++) {
          var stop = line.trains[i].stops[j];
          rows[j + 1].push(stop.departure || stop.arrival);
        }
      }
      var content = rows.map(function(row) {
        return '<tr><td>' + row.join('</td><td>') + '</td></tr>';
      }).join('');
      content = '<a class="close">&times;</a><table><tr>' + content + '</tr></table>';
      $('#timetable').html(content);
      $('.close').click(function() {
        $('#timetable').html('');
      });
    },
    drawStations : function(n) {
      n.stations.forEach(function(station) {
        if (station.size > 1 && !station.hide && station.terminus) {
          station.title = station.title.replace(/ z$/, '').replace(' žst', '').replace(' hlavní nádraží', '');
          station.elem = n.paper.circle(station.gridX, station.gridY, station.size);
          station.elem.attr({
            'fill': 'white',
            'stroke-width' : 2,
            'title': station.title,
            'cursor': 'pointer',
          });
          station.elem.click(function() {
            console.log(station);
            window.open( 'http://www.zelpage.cz/odjezdy-2016/' + station.id + '.html', station.title, '');
          });

          if (station.terminus) {
            var gridX = station.gridX / n.cellSize;
            var gridY = station.gridY / n.cellSize;
            var translateX = 1;
            var translateY = -1;
            var anchor = 'start';
            if (n.grid[gridX + 1] && !n.grid[gridX + 1][gridY]) {
              translateY = 0;
            } else if (((n.grid[gridX + 1] && n.grid[gridX + 1][gridY]) ||
                (n.grid[gridX + 1] && n.grid[gridX + 1][gridY - 1])) &&
                n.grid[gridX - 1] && !n.grid[gridX - 1][gridY] &&
                n.grid[gridX - 1] && !n.grid[gridX - 1][gridY - 1]) {
              anchor = 'end';
              translateX = -1;
            } else if ((n.grid[gridX + 1] && n.grid[gridX + 1][gridY] &&
                  n.grid[gridX - 1] && n.grid[gridX - 1][gridY]) ||
                (n.grid[gridX + 1] && n.grid[gridX + 1][gridY - 1] &&
                  n.grid[gridX - 1] && !n.grid[gridX + 1][gridY + 1])) {
              translateY = 1;
            }
            station.label = n.paper.text(station.gridX, station.gridY, '  ' + station.title.length > 20 ? station.title.substr(0, 20) + '...' : station.title);

            station.label.attr({
              'text-anchor' : anchor,
              'font-weight' : 'bold',
              'font-size' : 5 + station.size,
            });
            station.label.translate(translateX * (2 + station.size), translateY * (2 + station.size));
            //station.label.rotate(-10, station.gridX, station.gridY);
          }
        }
      });
      return n;
    },
  };
})();

function main() {
  var n = {};
  n.width = 3000;
  n.height = 1200;
  n.paper = new Raphael("map", n.width + 120, n.height + 40);

  var stationsUrl = 'data/stations.json';
  var that = {};
  $.get(stationsUrl, function(stations) {
    n.stations = stations.filter(function(s) {
      return s.lon && s.lat;
    });

    var trainsUrl = 'data/trains.json';
    $.get(trainsUrl, function(trains) {
      n.trains = trains;
      var linesUrl = 'data/lines.json';
      $.get(linesUrl, function(lines) {
        n.lines = lines;
        Processor.process(n);
      });
    });
  });
}
main();
