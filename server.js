// server.js
// where your node app starts

// init project
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const util = require('util');
const dns = require('dns');
const keyv = require('keyv');
const k = new keyv();

let currentHash;

(async function(){
 currentHash = await k.get("lastHash") || 1;
})();

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionSuccessStatus: 200}));  // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});


// TIMESTAMP -- PROJECT 1
app.get("/api/timestamp/:date", dateEndpoint);
app.get("/api/timestamp/", dateEndpoint);

function dateEndpoint(req, res) {
  let date = req.params.date ? new Date(req.params.date) : new Date();
  if(date == "Invalid Date"){
    return res.send({"error": "Invalid Date"});
  } else {
    return res.send({"unix": date.getTime(), "utc" : date.toUTCString()});
  }
}

// URL SHORTENER -- PROJECT 2
app.post('/api/shorturl/new/', async function(req, res){
  const URL = req.body.URL;
  //dns.lookup doesn't seem to be working on Glitch...
  dns.lookup(URL.replace(/^https?:\/\//gi, ''), async function(err){
    if(!err){
      let thisHash = currentHash;
      currentHash++;
      await k.set('url-' + thisHash, URL);
      return res.send({'original_url': URL, 'short_url': thisHash, 'ok': 'yes'});
    } else {
      console.log(err);
      return res.send({'error': 'invalid url'});
    }
  });
});
app.get('/api/shorturl/:hash', async function(req, res){
  let url = await k.get('url-' + req.params.hash);
  if(url){
    res.redirect(url);
  } else {
    res.redirect('/');
  }
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});