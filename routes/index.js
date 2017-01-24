var express = require('express');
var sf = require('node-salesforce');
var cookieParser = require('cookie-parser');
var mongoose = require('mongoose');
var request = require('request');
var router = express.Router();
var url = require('url');
var cmd = require('node-cmd');
var Account = require('../models/account.js');
var Mailchimp = require('mailchimp-api-v3')
var conn;
var user = {name: ''};
var mailchimp = new Mailchimp('691942aacc639712ee6fbec4334e12c9-us12');

/* GET home page. */
router.get('/', function(req, res, next) {
	if(req.session && req.session.user){
		res.render('index', {});
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
	  		var account = new Account(item);
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
		if(err)
			res.render('import', {error: true});
		else
	    	res.render('import', {data: users});  
	  });
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
        	var command = "curl --request GET -H 'Authorization: OAuth " + req.session.mailchimp.access_token + "' --url 'https://login.mailchimp.com/oauth2/metadata' --include";
			cmd.get(
		        command,
		        function(data){
		        	req.session.mailchimp.api_endpoint = JSON.parse('{"' + data.substr(data.lastIndexOf("api_endpoint"))).api_endpoint;
		        	res.send(req.session.mailchimp);
		        });
        }
    );
});

router.get('/getlists', function(req, res, next){
	mailchimp.get({
	  path : '/lists?count=25'
	}, function (err, result) {
		if(err)
			res.json(err);
		res.json(result);
	})
})

router.get('/createlists', function(req, res, next){
	res.render('list', {});  
})

router.post('/createlists', function(req, res, next){
	mailchimp.post({
	  path : '/lists'
	}, function (err, result) {
		if(err)
			res.json(err);
		res.json(result);
	})
})

router.get('/addmember', function(req, res, next){
	var data = {length: 0, counter: 0};
	var bool =true;
	Account.find().select({FirstName : 1, LastName : 1, Email: 1, _id: 0}).exec(function(err, records) {
	  	data.length = records.length;
		if(err)
			res.render('import', {error: true});
		for(var i = 0; i < records.length; i++){
			if(bool)
			console.log(records[i])
		bool=false;
			var mailchimpData = {
			  path : '/lists/d67e77a581/members',
			  body: {email_address: records[i].Email,
			    status: "subscribed",
			    merge_fields: {
			        FNAME: records[i].FirstName,
			        LNAME: records[i].LastName
			    	}
				}
			};
		mailchimp.post(mailchimpData, function (err, result) {
				if(err)
					// console.log(err);
				data.counter++;
				if(data.counter == data.length){
					res.render('list', {});  
				}
				console.log(result);
			}) 
		}

	  });
	
})


module.exports = router;