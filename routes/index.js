var express = require('express');
var sf = require('node-salesforce');
var cookieParser = require('cookie-parser');
var mongoose = require('mongoose');
var request = require('request');
var router = express.Router();
var url = require('url');
var cmd = require('node-cmd');
var Account = require('../models/account.js');
var conn;
var user = {name: ''};

/* GET home page. */
router.get('/', function(req, res, next) {
	if(req.session && req.session.user){
		res.render('index', { title: 'Express' });
	}
	else{	
		res.redirect('/login');
	}
});

router.get('/login', function(req, res, next){
	if(req.session && req.session.user){
		res.redirect('/');
	}
	else{
		res.render('login', {});
	}
});

router.post('/login', function(req, res, next) {
	conn = new sf.Connection({
	  // you can change loginUrl to connect to sandbox or prerelease env. 
	  loginUrl : 'https://login.salesforce.com' 
	});
	var temp = {username: req.body.username, password: req.body.password, securityToken: req.body.securityToken}; 
	//'Psychype@007DGbGbNUKinvWynjw3e5gheZV'
	conn.login(req.body.username, req.body.password + req.body.securityToken, function(err, userInfo) {
	console.log(userInfo);
		req.session.user = {username: req.body.username, 
			securityToken: req.body.securityToken, 
			accessToken: conn.accessToken,
			instanceUrl: conn.instanceUrl,
			userInfo: userInfo
		}
	  if (err) {
	  	res.render('login', {error: true});
	  }
	  else{
	  	res.redirect('/');
	  }
	});
});

router.get('/accounts', function(req, res, next) {
	var data = {length: 0, counter: 0};
	conn.sobject("Contact")
	  .find({})
	  .sort('Name')
	  .execute(function(err, records) {
	  	data.length = records.length;
	  	console.log(records.length);
	  	if(err){
	  		res.json("Something went wrong, please try after some time");
	  	}
	  	for(var item of records){
	  		var account = new Account();
	  		account.save(function (err) {
			  if (err) return handleError(err);
			  data.counter++;
			  if(data.counter == data.length)
			  	res.redirect('import');
			});
	  	}
  	});
});

router.get('/import', function(req, res, next) {
	Account.find({}, function(err, users) {

	    res.json(users);  
	  });
	  // res.render('import', {});
});

router.get('/mailchimp', function(req, res, next){
	res.redirect('https://login.mailchimp.com/oauth2/authorize?response_type=code&client_id=551741894008&redirect_uri=http://127.0.0.1:3000/oauth');
});

router.get('/oauth', function(req, res, next){
	var command = "curl --request POST --url 'https://login.mailchimp.com/oauth2/token' --data 'grant_type=authorization_code&client_id=551741894008&client_secret=5337816d81f874275ecbee3d9fbcccdc&redirect_uri=http://127.0.0.1:3000/oauth&code=" + req.query.code + "' --include";
	cmd.get(
        command,
        function(data){
        	req.session.mailchimp = JSON.parse(data.slice(data.lastIndexOf('{'), data.lastIndexOf('}') + 1));
        }
    );
});

router.get('/oauthgettoken', function(req, res, next){
})


module.exports = router;