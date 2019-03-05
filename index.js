const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

const config = require('./config.json');
 
const app = express()
 
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
 
app.post('/v1/price', async (req, res) => {
    const {from, to} = req.body;
    
    if (!from || !to) {
        res.status(500).send({
            "error": "From and To destination should be specified"
        });

        return;
    }

    let [fromCoordinates, toCoordinates] = await Promise.all([
        fetch(`${config.google.url}address=${from}&key=${config.google.token}`),
        fetch(`${config.google.url}address=${to}&key=${config.google.token}`)
    ]);

    [fromCoordinates, toCoordinates] = await Promise.all([
        fromCoordinates.json(),
        toCoordinates.json()
    ]);

    try {
        [fromCoordinates, toCoordinates].map((data) => {
            if (typeof data === 'error') {
                throw new Error('No coordinates from vendor');
            }
        });
    } catch (err) {
        res.status(500).send({
            "error": err.message
        });

        return;
    }

    try {
        fromCoordinates = fromCoordinates.results[0].geometry.location;
        toCoordinates = toCoordinates.results[0].geometry.location;
    } catch (err) {
        res.status(500).send({
            "error": `${err.message} one of destinations not found`
        });

        return;
    }

    let uberResponse = await fetch(`${config.uber.url}start_latitude=${fromCoordinates.lat}&start_longitude=${fromCoordinates.lng}&end_latitude=${toCoordinates.lat}&end_longitude=${toCoordinates.lng}`, {
        method: 'GET',
        headers: {
            'Authorization': `Token ${config.uber.token}`,
            'Accept-Language': 'en_US',
            'Content-Type': 'application/json'
        }
    });

    try {
        uberResponse = await uberResponse.json();
    } catch (err) {
        res.status(500).send({
            "error": err.message
        });

        return;
    }

    res.send({
        "result": uberResponse.prices
    });
});

app.use('/', express.static('frontend'));

app.listen(3000, () => {
    console.log('AfterUber app started on port 3000!');
});