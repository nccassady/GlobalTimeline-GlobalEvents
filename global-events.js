const express = require('express')
const cors = require('cors')
const app = express()
const port = 3030
const MongoClient = require('mongodb').MongoClient
const { URL, URLSearchParams } = require('url');
const config = require('config');

var db
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
var request = require('request');
var dbUrl =
    'mongodb://' +
    config.get('database.user') + ':' +
    config.get('database.password') + '@' +
    config.get('database.url') + ':' +
    config.get('database.port') + '/' +
    config.get('database.name')

MongoClient.connect(dbUrl, (err, database) => {
    if (err) return console.log(err)
    db = database
    app.listen(port, () => {
        console.log('listening on ' + port)
    })
})

app.post('/event', jsonParser, function (req, res) {
    console.log('POST /event')

    var error = null

    if (!req.body.description || !req.body.date || !req.body.latitude || !req.body.longitude) {
        error = 'The following fields are required: Description, Date, Latitude, and Longitude.'
    }

    var newDate = req.body.date.split('-')
    req.body.date = new Date(newDate[0], newDate[1]-1, newDate[2])

    searchObject = searchByBounds(req.query.bounds, searchObject);
    searchObject = searchByDate(req.query.date, searchObject);
    var searchResults;
    db.collection('events').find(searchObject).toArray(function(err, results) {
        console.log(results);
        searchResults = results;
    })
    console.log("search results: " + searchResults)

    if (error) {
        res.send('ERROR: ' + error)
    } else{
        if (!searchResults) {
            db.collection('events').save(req.body, (err, result) => {
                if (err) return console.log(err)

                console.log('saved to database')
                res.json(result)
            })
        }
    }
})

var searchByDate = function (date, searchObject) {
    var separatedDate = date.split('-')
    var startDate = new Date(separatedDate[0], separatedDate[1]-1, separatedDate[2])
    var nextDay = new Date(startDate);
    nextDay.setDate(startDate.getDate()+1);
    console.log(nextDay);

    console.log('separatedDate: ' + separatedDate)
    console.log('date: ' + date)
    console.log('start date: ' + startDate)
    console.log('end date: ' + nextDay)

    searchObject['date'] = {
        $gte: startDate,
        $lt: nextDay
    }

    return searchObject;
};

var searchByBounds = function (bounds, searchObject) {
    var boundsArray = bounds.split(',');
    var northWestLat = parseInt(boundsArray[0]);
    var northWestLng = parseInt(boundsArray[1]);
    var southEastLat = parseInt(boundsArray[2]);
    var southEastLng = parseInt(boundsArray[3]);

    searchObject['latitude'] = {
        $lte: northWestLat,
        $gte: southEastLat
    }
    searchObject['longitude'] = {
        $gte: northWestLng,
        $lte: southEastLng
    }

    return searchObject;
}

app.get('/search', cors(), function (req, res, next) {
    console.log('GET /search')
    var searchObject = {};
    if (req.query.bounds) {
        searchObject = searchByBounds(req.query.bounds, searchObject);
    }

    if (req.query.date) {
        searchObject = searchByDate(req.query.date, searchObject);
    }

    console.log(searchObject);

    db.collection('events').find(searchObject).toArray(function(err, results) {
        console.log(results);
        res.json(results)
    })
})
