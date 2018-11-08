// server.js
// where your node app starts

// init project
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const util = require('util');
const dns = require('dns');
const keyv = require('keyv');
const env = process.env;
const sha1 = require('sha1');
const formidable = require('express-formidable');
const k = new keyv('mongodb://' + env.USER + ':' + env.PASSWORD + '@' + env.SERVER, {collection: 'fcc'});

var MAX_TIMESTAMP = 8640000000000000;

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
app.use(formidable());
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


// REQUEST HEADER PARSER -- PROJECT 2

app.get('/api/whoami/', async function(req, res){
  let ipaddress = (req.headers['x-forwarded-for'] || req.connection.remoteAddress).split(',')[0];
  let language = req.headers['accept-language'];
  let software = req.headers['user-agent'];
  res.send({ipaddress, language, software});
});

// URL SHORTENER -- PROJECT 3
app.post('/api/shorturl/new/', async function(req, res){
  const URL = req.body.URL || '';
  //dns.lookup doesn't seem to be working on Glitch...
  dns.lookup(URL.replace(/^https?:\/\//gi, ''), async function(err, ip){
    if(!err && ip){
      let thisHash = currentHash;
      currentHash++;
      await k.set('url-' + thisHash, URL);
      k.set('lastHash', currentHash); 
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

//EXCERCISE TRACKER -- PROJECT 4

app.get("/exercise", function (req, res) {
  res.sendFile(__dirname + '/views/exercise.html');
});

app.post('/api/exercise/new-user', async function(req, res){
  let body = {...req.body, ...req.fields, ...req.query};
  let username = body.username;
  if(!username){
    return res.send({error: 'username required'});
  }
  let userId = sha1(username);
  userId = userId.substr(0, 8);  
  if(await k.get(userId)){
    return res.send({error: 'username taken'});
  }
  console.log('a');
  await k.set(userId, {username, exercise: []});
  console.log({userId, username});
  res.send({userId, username});
});

app.post('/api/exercise/add', async function(req, res){
  let body = {...req.body, ...req.fields, ...req.query};
  let userId = body.userId;
  let userData = await k.get(userId);
  if(!userData){
    return res.send({error: 'invalid username'});
  }
  
  let description = body.description;
  let duration = body.duration;
  let date = body.date;
  date = date?new Date(date):new Date();
  userData.exercise = userData.exercise || [];
  userData.exercise.push({duration, description, date});
  await k.set(userId, userData);
  res.send({success: true});
});

app.get('/api/exercise/log', async function(req, res){
  let body = {...req.body, ...req.fields, ...req.query};
  let userId = body.userId;
  let userData = await k.get(userId);
  console.log(body);
  console.log(userData);
  let from = new Date(req.body.from || -MAX_TIMESTAMP);
  let to = new Date(req.body.to || MAX_TIMESTAMP);
  let limit = body.limit|| 1000;
  let page = body.page || 0;
  let out = {};
  if(!userData)
    return res.send({error: 'invalid username'});
  
  out.exercise = userData.exercise.slice(page * limit, limit);
  out.exercise = out.exercise.filter((v) => {
      let date = new Date(v.date);
      return date > from && date < to;
  });
  
  res.send({...userData, ...out});
});

//FILE METADATA -- PROJECT 5

app.post('', async function(req, res){
  
});

app.get('/api/*', function(req, res){
  res.send({"error": "invalid URL"});
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});