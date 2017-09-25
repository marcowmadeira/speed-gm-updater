var request = require('request');
var cheerio = require('cheerio');
var gamedig = require('gamedig');
var credentials = require('./auth.json');

var cookieJar = request.jar();

console.log('» Loggin in to Speed-GM.');
request.post('https://waac.speed-gm.com/json/client.php', {jar: cookieJar, form:{email:credentials.email, passwd:credentials.password, func: 'login'}}, function(err, res, body){
	if (body.indexOf('OK') == -1 || err)
	{
		console.error('» Unable to login.');
		return;
	}
	
	console.log('» Logged in to Speed-GM.');
	console.log('» Requesting the latest CS:GO version from steam.');

	// Request csgo version
	request('http://api.steampowered.com/ISteamApps/UpToDateCheck/v1?appid=730&version=0', function(err, res, body) {
		if (err)
		{
			console.error('» Unable to get CSGO version.');
			console.error(err);
			return;
		}

		var updatedVer = JSON.parse(body).response.required_version;

		console.log('» Acquired lastest CS:GO version ('+updatedVer+').');

		// Request server list
		request('https://waac.speed-gm.com/', {jar: cookieJar}, function(err, res, body)
		{
			if (err)
			{
				console.error('» Unable to get Server list from Speed-GM');
				console.error(err);
				return;
			}

			$ = cheerio.load(body);

			$('#ui_tabs_sv_jogo tbody tr').each(function(i, elm) {
				var server = {
					name: $(elm).find('td:nth-child(2)').text(),
					address: $(elm).find('td:nth-child(3)').text(),
					id: $(elm).find('li a').attr('id')
				};

				var s = /(.*):(.*)/.exec(server.address);

				// Query the server to get the current version
				gamedig.query({
					type: 'csgo',
					host: s[1],
					port: parseInt(s[2])
				}, function(state)
				{
					if (state.error) {
						console.error('» An error occurred loading the server', server.name);
						return;
					}

					var v = state.raw.version.replace(/\./g, '');

					if (v == updatedVer)
					{
						// Server is updated
						return;
					}

					console.log('»', server.name, 'is outdated');

					// Update the server
					request.post({url:'https://waac.speed-gm.com/json/client.php', jar: cookieJar, form:{func:'steam_update2', servidor:server.id}}, function(err, res, body) {
						if (err || (typeof body != 'undefined' && body.indexOf('OK') == -1))
						{
							console.error('» Unable to update', server.name);
							if (err) console.error(err);
							return;
						}
						
						console.log('» ', server.name, 'is being updated');
					});
				});
			});
		});
	});	
});