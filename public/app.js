
(function(exports) {
    var client_id = 'd7a02f8b813f4ed6b518e39c945c53fd'; // Fill in with your value from Spotify
    var redirect_uri = 'http://localhost:3000/index.html';
    var g_access_token = '';
    var user = '';
    /*
     * Get the playlists of the logged-in user.
     */

    var PlaylistModel = function() {
        this.observerList = [];
        this.songs = {};
        this.tags = [];
        this.loaded = false;
        this.update_time = 0;

        this.addObserver = function(observer) {
            this.observerList.push(observer);
        }

        this.notify = function() {
            this.observerList.forEach(function(i) {
                i.update();
            });
        }

        var Song = function(name, artist, id) {
            this.rating = -1;
            this.id = id;
            this.name = name;
            this.artist = artist;
        }

        var Playlist = function(name, href) {
            this.songs = [];
            this.name = name;
            this.href = href;
        }

        this.playlists = [];

        this.apiHelper = function(url, callback) {
            $.ajax(url, {
                dataType: 'json',
                headers: {
                    'Authorization': 'Bearer ' + g_access_token
                },
                success: function(r) {
                    callback(r.items);
                },
                error: function(r) {
                    callback(null);
                }
            });
        }

        this.getUserInfo = function(callback) {
            var url = 'https://api.spotify.com/v1/me/';
            $.ajax(url, {
                dataType: 'json',
                headers: {
                    'Authorization': 'Bearer ' + g_access_token
                },
                success: function(data) {
                    user = data.id;
                    callback();
                },
                error: function(r) {
                    callback(null);
                }
            });
        }

        this.addToTagList = function(key) {
            var does_exist = $.inArray(key, this.tags)
            if (does_exist == -1) {
                this.tags.push(key);
            }
        }

        this.fetchPlaylists = function() {
            this.update_time = 0;
            this.playlists = [];
            this.loaded = false;
            var that = this;
            var api = this.apiHelper;
            this.apiHelper("https://api.spotify.com/v1/me/playlists", function(items) {
                var counter = 1;
                var len = items.length;
                items.forEach(function(item) {
                    var p = new Playlist(item.name, item.tracks.href);
                    that.playlists.push(p);
                    api(item.tracks.href, function(data) {
                        var c = 1;
                        data.forEach(function(i) {
                            p.songs.push(new Song(i.track.name, i.track.artists[0].name, i.track.id));
                            var url = 'http://localhost:3000/songs?id=' + i.track.id;
                            $.ajax(url, {
                                dataType: 'json',
                                headers: {
                                    'Authorization': 'Bearer ' + g_access_token
                                },
                                success: function(data) {
                                    if (data.length == 0) {
                                        that.songs[i.track.id] = {
                                            name: i.track.name,
                                            artist: i.track.artists[0].name,
                                            rating: -1,
                                            id: i.track.id
                                        };
                                        $.post("http://localhost:3000/songs", that.songs[i.track.id], null, "json");
                                    } else {
                                        that.songs[i.track.id] = data[0];
                                        var object = that.songs[i.track.id];
                                        Object.keys(object).forEach(function(key) {
                                            if ((key != 'rating') && (key != 'id') && (key != 'artist') && (key != 'name') && (object[key] == 'true')) {
                                                that.addToTagList(key);
                                            }
                                        })
                                    }
                                    if (c == data.length) {
                                        ++counter;
                                        if (counter == len) {
                                            that.loaded = true;
                                        }
                                        var d = new Date();
                                        var t = d.getTime();
                                        if ((t - that.update_time) > 1000) {
                                            that.notify();
                                            that.update_time = d.getTime();
                                        }


                                    }
                                    ++c;
                                },
                                error: function(r) {}
                            });
                        })
                    })
                })
            })
        }

        var that = this;
        this.getUserInfo(function() {
            that.fetchPlaylists()
        });
    };


    /*
     * Redirect to Spotify to login.  Spotify will show a login page, if
     * the user hasn't already authorized this app (identified by client_id).
     *
     */


    var PlaylistView = function(model) {
        this.currentSearchStar = 0;
        this.page = 0;
        this.name = '';
        this.songs = [];
				this.availableVideos = {"Starboy":'34Na4j8AVgA', "Black Beatles": 'b8m9zhNAgKs', "Closer": '0zGcUoRlhmw', "Don't Wanna Know": 'ANS9sSJA9Yc',"24K Magic": 'UqyT8IEBkvY', "All We Know": '7mWQ38SpEf8', "Aqualung": 'UCMS-NJ7VxU'};

        var that = this;
        this.generateStars = function(id) {
            return '<fieldset class="song-rater"> <input type="radio" id="' + id + 'star5" name=' + id + ' value="5" /><label class = "full" for="' + id + 'star5" title="Best Song Ever!"></label> <input type="radio" id="' + id + 'star4" name=' + id + ' value="4" /><label class = "full" for="' + id + 'star4" title="Great song!"></label> <input type="radio" id="' + id + 'star3" name=' + id + ' value="3" /><label class = "full" for="' + id + 'star3" title="Good song!"></label> <input type="radio" id="' + id + 'star2" name=' + id + ' value="2"/><label class = "full" for="' + id + 'star2" title="Not good"></label> <input type="radio" id="' + id + 'star1" name=' + id + ' value="1" /><label class = "full" for="' + id + 'star1" title="Terrible song"></label> </fieldset> </br>';
        }

        this.updateSongRating = function(name, value) {
            model.songs[name].rating = value;
            var url = "http://localhost:3000/songs/" + model.songs[name].id;
            var type = "PATCH";
            if ((model.songs[name].id) == null) {
                url = "http://localhost:3000/songs/";
                type = "POST"
            }
            $.ajax({
                url: url,
                type: type,
                data: model.songs[name],
                dataType: 'json',
                success: function(result) {
                }
            });
        }

        this.removeTag = function(tag_name, id) {
            model.songs[id][tag_name] = 'false';
            var url = "http://localhost:3000/songs/" + model.songs[id].id;
            $.ajax({
                url: url,
                type: 'PATCH',
                data: model.songs[id],
                dataType: 'json',
                success: function(result) {}
            });
        }

        this.addTag = function(tag_name, id) {
            model.songs[id][tag_name] = 'true';
            var url = "http://localhost:3000/songs/" + model.songs[id].id;
            var type = "DELETE";
            if ((model.songs[id].id) == null) {
                url = "http://localhost:3000/songs/";
                type = "POST"
            }
            $.ajax({
                url: url,
                type: type,
                data: model.songs[id],
                dataType: 'json',
                success: function(result) {
                    if (type == "DELETE") {
                        $.ajax({
                            url: "http://localhost:3000/songs/",
                            type: 'POST',
                            data: model.songs[id],
                            dataType: 'json',
                            success: function(result) {}
                        })
                    } else {}
                }
            });
        }

        this.generateTags = function(id) {
            var tags = '';
            var object = model.songs[id];
            var that = this;
            Object.keys(object).forEach(function(key) {
                if ((key != 'rating') && (key != 'id') && (key != 'artist') && (key != 'name') && (object[key] == 'true')) {
                    tags = tags + key + '<a class=remove id="' + id + '" name="' + key + '" >(Remove)</a>      ';
                }
            });
            return tags;
        }

        this.generateTagsSearch = function(id) {
            var tags = '';
            var object = model.songs[id];
            var that = this;
            Object.keys(object).forEach(function(key) {
                if ((key != 'rating') && (key != 'id') && (key != 'artist') && (key != 'name') && (object[key] == 'true')) {
                    tags = tags + key + ' ';
                }
            });
            return tags;
        }

        this.searchByStar = function(val) {
            this.page = 9;
            this.currentSearchStar = val;
            $('#searchpage').empty();
            var obj = (model.songs)
            for (var song in obj) {
                var i = obj[song];
                if (i.rating >= val) {
                    $('#searchpage').append('<li id=' + i + '> <a href="#" onclick="return false;">' +i.name + ' by ' + i.artist + '</a> </li>');
                    $('#searchpage').append(that.generateStars(i.id));
                    var rating = model.songs[i.id].rating;
                    if (rating != -1) {
                        $('#' + i.id + 'star' + rating).attr('checked', 'checked');
                    }
                    $('#searchpage').append('<br> Tags: ' + that.generateTagsSearch(i.id) + '<br>');
                    $('#searchpage').append('<br>');
                }
            }
            $(':radio').click(function() {
                that.updateSongRating(this.name, this.value);
            })
        }

				this.generateVideoLink = function(name) {
					var that = this;
					if (this.availableVideos[name]!=null) {
						$('#playlist_title').append('<button class="tag-add" id="'+this.availableVideos[name] + '" > Watch Video </button> </br>');
						$('#'+this.availableVideos[name]).click(function() {
							that.page = 6;
							$('#searchpage').hide();
							$('#playlist_title').empty();
							$('#songlist').hide();
							$('#loggedin').hide();
							$('#player').empty();
							$('#player').show();
							$('#player').append('</br> </br> <iframe class="youtube" width="315" height="237" allowfullscreen="allowfullscreen" src="https://www.youtube.com/embed/'+ this.id + '"> </iframe>')
						})
					}
				}

        this.doTagSearch = function(tags) {
            this.page = 8;
            $('#searchpage').empty();
            var obj = (model.songs)
            for (var song in obj) {
                var i = obj[song];
                for (var k = 0; k < tags.length; ++k) {
                    if (i[tags[k]] == 'true') {
                        $('#searchpage').append('<li id=' + i + '> <a href="#">' + i.name + ' by ' + i.artist + '</a> </li>');

                        $('#searchpage').append(that.generateStars(i.id));
                        var rating = model.songs[i.id].rating;
                        if (rating != -1) {
                            $('#' + i.id + 'star' + rating).attr('checked', 'checked');
                        }
                        $('#searchpage').append('<br> Tags: ' + that.generateTagsSearch(i.id) + '<br>');

                        $('#searchpage').append('<br>');
                        break;
                    }
                }
            }
            $(':radio').click(function() {
                that.updateSongRating(this.name, this.value);
            })
        }

        this.search = function() {



            var that = this;
            var id = 'search';

						$('#player').empty();
            $('#searchpage').empty();
            $('#searchpage').show();
            $('#playlist_title').empty();
            $('#songlist').hide();
            $('#loggedin').hide();
            $('#searchpage').append('<h2> Search Songs </h2>');

            $('#searchpage').append('<h3 class="titles">  Rating Search </h3>');
            $('#searchpage').append('<h5> Click on the rating star to search for songs equal or greater to the clicked rating  </h5>');

            $('#searchpage').append('<fieldset class="song-rater" id="searchstars"> <input type="radio" id="' + id + 'star5" name=' + id + ' value="5" /><label class = "full" for="' + id + 'star5" title="Best Song Ever!"></label> <input type="radio" id="' + id + 'star4" name=' + id + ' value="4" /><label class = "full" for="' + id + 'star4" title="Great song!"></label> <input type="radio" id="' + id + 'star3" name=' + id + ' value="3" /><label class = "full" for="' + id + 'star3" title="Good song!"></label> <input type="radio" id="' + id + 'star2" name=' + id + ' value="2"/><label class = "full" for="' + id + 'star2" title="Not good"></label> <input type="radio" id="' + id + 'star1" name=' + id + ' value="1" /><label class = "full" for="' + id + 'star1" title="Terrible song"></label> </fieldset> </br>');
            $('#searchpage').append('</br>');
            $('#searchpage').append('<h3 class="titles">  Tag Search </h3>');
            $('#searchpage').append('<h5> Check the tags that you want to search for, and then click the Search Tags button below  </h5>');

            for (var i = 0; i < model.tags.length; ++i) {
                $('#searchpage').append('<input id="t' + model.tags[i] + '" class="rush" type="checkbox"> ' + model.tags[i] + ' </input> </br>')
            }
            $('#searchpage').append('</br>');
            $('#searchpage').append('<button id="search-tags" class="tag-add" >Search Tags</button>');
            $('#searchpage').append('</br>')
            $(':radio').click(function() {
                that.page = 4;
                that.searchByStar(this.value);
            })
            $('#search-tags').click(function() {
                var tags = [];
                for (var i = 0; i < model.tags.length; ++i) {
                    var x = $("#t" + model.tags[i]).prop('checked');
                    if ((x != undefined) && (x == true)) {
                        tags.push(model.tags[i]);
                    }
                }
                that.page = 4;
                that.doTagSearch(tags)
            })


            // model.tags.forEach(function (i) {
            // 	$('#search').append('<h1> Search Songs </h1>')
            // }

        }

        this.showPlaylist = function(name, songs) {
            $('#searchpage').empty();
            $('#searchpage').hide();
            $('#loggedin').hide();
						$('#player').empty();
            $('#songlist').show();
            $('#playlist_title').empty();
            $('#playlist_title').show();
            $('#playlist_title').append('<h3>' + name + '</h3>');
            var that = this;
            songs.forEach(function(i) {
                if (model.songs[i.id] == undefined) return;
                $('#playlist_title').append('<li id=' + i + '> <a href="#" onclick="return false;">' + i.name + ' by ' + i.artist + ' </a> </li>');
                $('#playlist_title').append(that.generateStars(i.id));
                var rating = model.songs[i.id].rating;
                if (rating != -1) {
                    $('#' + i.id + 'star' + rating).attr('checked', 'checked');
                }
                $('#playlist_title').append('<br> Tags: ' + that.generateTags(i.id) + '<br>');
                $('#playlist_title').append('<button id="button' + i.id + '" class="tag-add">Add Tag</button>');
								(that.generateVideoLink(i.name));

                $('#button' + i.id).click(function() {
                    var tag_name = window.prompt("Enter a tag for " + model.songs[i.id].name);
                    if (tag_name == null) {
                        return;
                    }

                    that.addTag(tag_name, i.id);
                    model.addToTagList(tag_name);
                    that.update();
                })

                $('#playlist_title').append('<br>');
            })
            $('.remove').one('click', function() {
                var key = this.name;
                model.songs[this.id][key] = 'false';
                that.removeTag(key, this.id);
                that.update();
                return;
            })
            $(':radio').click(function() {
                that.updateSongRating(this.name, this.value);
            })
        }

        this.update = function() {
            var counter = 0;

            if (this.page == 0) {
                $('#searchpage').hide();
								$('#player').empty();
                $('#playlists').empty();
                $('#songlist').hide();
                $('#login').hide();
                $('#loggedin').show();
                $('#welcome').empty();
                $('#welcome').append('<h1>' + "Welcome " + user + '</h1>');
            } else if (this.page == 1) {
                this.showPlaylist(this.name, this.songs);
                return;
            } else if (this.page == 3) {
                return this.search();
            }
            else if (this.page == 9) {
              return this.searchByStar(this.currentSearchStar);
            }

            var that = this;
            model.playlists.forEach(function(i) {
                $('#playlists').append('<li id=' + counter + '> <a href="#">' + i.name + '</a> </li>');
                $('#' + counter).click(function() {
                    that.page = 1;
                    that.name = i.name;
                    that.songs = i.songs;
                    that.showPlaylist(i.name, i.songs);
                });
                ++counter;
            })
        }
        var that = this;
        model.addObserver(this)
        $('#home').click(function() {
            that.page = 0;
            that.update();
        });
        $('#search').click(function() {
            that.page = 3;
            that.search();
        });

    }

    var doLogin = function(callback) {
            var url = 'https://accounts.spotify.com/authorize?client_id=' + client_id +
                '&response_type=token' +
                '&scope=playlist-read-private' +
                '&redirect_uri=' + encodeURIComponent(redirect_uri);
            window.location = url;
        }
        /*
         * What to do once the user is logged in.
         */
    function showPlaylist(name, url) {
        $('#loggedin').hide();
        $('#songlist').show();
        $('#playlist_title').append('<h3>' + name + '</h3>');
        apiHelper(url, function(items) {
            items.forEach(function(i) {
                $('#playlist_title').append('<li id=' + i + '> <a href="#">' + i.track.name + '</a> </li>');
                $('#playlist_title').append(generateStars());
            })
        })
    }

    exports.startApp = function() {
        $('#songlist').hide();
        $('#loggedin').hide();
				$('#player').hide();

        var now = new Date();

        // Parse the URL to get access token, if there is one.
        var hash = location.hash.replace(/#/g, '');
        var all = hash.split('&');
        var args = {};
        all.forEach(function(keyvalue) {
            var idx = keyvalue.indexOf('=');
            var key = keyvalue.substring(0, idx);
            var val = keyvalue.substring(idx + 1);
            args[key] = val;
        });

        if (typeof(args['access_token']) == 'undefined') {
            $('#start').click(function() {
                doLogin(function() {});
            });
            $('#login').show();
        } else {
            g_access_token = args['access_token'];
            var model = new PlaylistModel();
            var view = new PlaylistView(model);
        }
    }

})(window);
