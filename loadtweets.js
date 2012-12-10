var twitter = require('ntwitter');

var $ = require('jquery');

var settings = require('./settings');
var models = require('./models');

// Rate limit is 180 requests per 15 minutes
var LOAD_INTERVAL = 15 * 60 * 1000 / 180;
var MAX_ID_REGEXP = /max_id=(\d+)/;

var twit = new twitter({
    'consumer_key': settings.TWITTER_CONSUMER_KEY,
    'consumer_secret': settings.TWITTER_CONSUMER_SECRET,
    'access_token_key': settings.TWITTER_ACCESS_TOKEN_KEY,
    'access_token_secret': settings.TWITTER_ACCESS_TOKEN_SECRET
});

var max_id = process.argv.length > 2 ? process.argv[2] : null;
var count = 0;

function loadtweets() {
    var params = {'include_entities': true, 'count': 100, 'max_id': max_id, 'q': settings.TWITTER_QUERY.join(' OR ')};
    console.log("Making request, max_id = %s", max_id);
    twit.get('/search/tweets.json', params, function(err, data) {
        if (err) {
            console.error("Twitter fetch error: %s", err);
            process.exit(1);
            return;
        }

        console.log("Processing")

        if (data.statuses.length === 0) {
            console.log("%s new tweets fetched", count, max_id);
            process.exit(0);
        }

        $.each(data.statuses, function (i, tweet) {
            models.storeTweet(tweet, function () {
                count++;

                if (count % 100 == 0) {
                    console.log("%s new tweets fetched", count, max_id);
                }
            });
        });

        var max_id_match = MAX_ID_REGEXP.exec(data.search_metadata.next_results);
        if (!max_id_match) {
            return;
        }

        max_id = max_id_match[1];

        setTimeout(loadtweets, LOAD_INTERVAL);
    });
}

loadtweets();
