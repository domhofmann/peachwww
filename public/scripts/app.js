$(function () {
  Interface.$sidebar =  $('#sidebar');
  Interface.$content = $('#content');
  Interface.$header = $('#header');
  Interface.$comments = $('#comments');
  Interface.$compose = $('#compose');

  $(document).on('lazybeforeunveil', function (e) {
    var $element = $(e.target);
    if ($element.is('video')) {
      $element[0].play();
    }
  });

  $(document).on('Peach.viewComments', function (e, postID) {
    if (postID == State.selectedPostID) {
      Interface.$comments.find('.close').click();
      return false;
    }

    State.selectedPostID = postID;

    Request.withStreamToken('GET', 'post/' + postID, null, {
      success: function (data) {
        $('body').addClass('comments-on')
        Interface.$comments.find('.comment-list').empty();
        Interface.$comments.removeClass('hidden');;
        var post = data['data']['posts'][0];
        Interface.$comments.find('.comment-list').append(Builder.CommentList(post));
        Interface.$comments.find('textarea').focus();
      }
    });
  });

  $(document).on('Peach.deletePost', function (e, postID) {
    Request.withStreamToken('DELETE', 'post/' + postID);
    var matchingIndex = -1;
    var posts = State.connectionsMap[State.selectedStreamID]['posts'];

    for (var i = 0; i < posts.length; i++) {
      var post = posts[i];
      if (post['id'] == postID) {
        matchingIndex = i;
        break;
      }
    }

    if (matchingIndex > -1) {
      posts.splice(matchingIndex, 1);
    }
  });

  Interface.$comments.find('.close').click(function () {
    Interface.$comments.addClass('hidden');
    $('body').removeClass('comments-on');
    Interface.$comments.find('textarea').val('');
    Interface.$comments.find('textarea').blur();
    State.selectedPostID = null;
    return false;
  });

  Interface.$comments.find('form').submit(function () {
    var commentText = $(this).find('.comment-text').val();
    if (commentText.trim().length < 1) {
      return false;
    }

    var me = State.connectionsArray[0];
    var comment = {
      'author': {
        'displayName': me['displayName'],
        'name': me['name'],
        'avatarSrc': me['avatarSrc']
      },
      'body': commentText
    };
    Interface.$comments.find('.comment-list').append($(Builder.Comment(comment)));
    Interface.$comments.find('textarea').val('');

    var count = Interface.$comments.find('.comment-list').children().length;
    Interface.$content.find('.post[data-postid="' + State.selectedPostID + '"] .comment a').text('Comment (' + count + ')');

    Request.withStreamToken('POST', 'comment', {
      'postId': State.selectedPostID,
      'body': commentText
    }, {
      success: function (data) {
        if (data['success'] == true) {
        }
      }
    });
    return false;
  });

  var reloadTitle = function () {
    var freshCount = $('.contact.fresh').length;
    if (freshCount > 0) {
      document.title = '(' + freshCount + ') Peach';
    } else {
      document.title = 'Peach';
    }
  }

  var refresh = function () {
    if (!StreamToken) {
      Interface.$loginModal = $('.modal.login');
      Interface.$loginModal.removeClass('hidden');
      Interface.$loginModal.find('.content form').submit(function () {
        var email = $(this).find('.email').val();
        var password = $(this).find('.password').val();

        Request.withoutToken('POST', 'login', {
          'email': email,
          'password': password
        }, {
          success: function (data) {
            if (data['success'] == true) {
              data = data['data'];
              if (data['streams'] && data['streams'].length > 0) {
                SetStreamToken(data['streams'][0]['token']);
                $(this).find('.email').val('');
                $(this).find('.password').val('');
                Interface.$loginModal.addClass('hidden');
                refresh();
              }
            } else {
              alert('Invalid username or password. Try again?');
            }
          }
        });
        return false;
      });

      return;
    }

    var expectedBuild = 2;
    $.get('/version', function (data) {
      if (data) {
        if (data['build'] && data['build'] > expectedBuild) {
          $('#refresh').removeClass('hidden');
        }
      }
    });

    Request.withStreamToken('GET', 'connections', null, {
      success: function (data) {
        data = data['data'];

        State.connectionsArray = data['connections'];
        State.connectionsArray.unshift(data['requesterStream']);

        State.connectionsMap = {};

        Interface.$sidebar.empty();
        if (!State.selectedStreamID) {
          Interface.$content.empty();
        }

        State.connectionsArray.forEach(function (connection, index) {
          State.connectionsMap[connection['id']] = connection;
          var $sidebarElement = Builder.SidebarElement(connection);
          if (State.selectedStreamID && connection['id'] == State.selectedStreamID) {
            $sidebarElement.addClass('selected');
          }

          if (index == 0) {
            $sidebarElement.addClass('me');
            $sidebarElement.removeClass('fresh');
          }

          Interface.$sidebar.append($sidebarElement);
        });

        $('.contact a').click(function () {
          if ($(this).parent().hasClass('selected')) {
            return false;
          }

          if ($(this).parent().hasClass('me')) {
            $('body').addClass('me');
            Interface.$compose.find('input').focus();
          } else {
            $('body').removeClass('me');
            Interface.$compose.find('input').blur();
          }

          Interface.$comments.find('.close').click();

          $('.contact.selected').removeClass('selected').removeClass('fresh');
          reloadTitle();
          $(this).parent().addClass('selected');

          var id = $(this).parent().data('id');
          var fresh = $(this).parent().hasClass('fresh');
          State.selectedStreamID = id;

          // shouldn't be necessary but improves performance of video playback
          // also keeps memory footprint lower *shrug*
          $('video').each(function () {
            this.pause();
            this.src = '';
            this.load();
            delete this;
          });

          Interface.$content.empty();
          var posts = State.connectionsMap[id]['posts'];
          var firstNewPost = null;
          posts.forEach(function (post) {
            if (fresh && post['isUnread'] && !firstNewPost) {
              firstNewPost = post;
              Interface.$content.append(Builder.NewPostsIndicator());
            }
            Interface.$content.append(Builder.Post(post));
          });

          Request.withStreamToken('PUT', 'stream/id/' + id + '/read', null);

          Interface.$header.empty().append(Builder.Header(State.connectionsMap[id]));
          Interface.$content.scrollTop(1E10);

          return false;
        });

        if (!State.selectedStreamID) {
          $('.contact.me a').click();
        }

        reloadTitle();
      }
    });
  };

  var createPost = function (message) {
    var post = {
      'message': message,
      'createdTime': Math.floor(Date.now() / 1000),
      'updatedTime': Math.floor(Date.now() / 1000),
      'likeCount': 0,
      'commentCount': 0,
      'comments': [],
    };

    var $post = Builder.Post(post);
    Interface.$content.append($post);
    Interface.$content.scrollTop(1E10);

    State.connectionsArray[0]['posts'].push(post);

    Request.withStreamToken('POST', 'post', {
      'message': message
    }, {
      success: function (data) {
        $post.data('postid', data['data']['id']);
      }
    });
  };

  document.onkeydown = function (e) {
    if ($('body').hasClass('me')) {
      return;
    }

    switch (e.keyCode) {
      case 37:
        $('.contact.selected').prev().find('a').click();
        break;
      case 39:
        $('.contact.selected').next().find('a').click();
        break;
    }
  };

  Interface.$compose.find('input').keyup(function (e) {
    if (e.keyCode == 13) {
      var text = Interface.$compose.find('input').val().trim();

      if (text.length > 0) {
        var fallback = function () {
          createPost([
            {'type': 'text', 'text': text}
          ]);
        };

        Interface.$compose.find('input').val('');

        // TODO: bad regex, should replace
        // All of this should probably be handled server side, but it'll catch some GIFs for now
        var urlMatch = /(^|\b)([\w.]+\.[a-z]{2,3}(?:\:[0-9]{1,5})?(?:\/.*)?)([,\s]|$)/ig;

        var matches = urlMatch.exec(text);
        if (matches && matches.length > 0) {
          var potentialImageURL = 'https://' + matches[0];
          var potentialImageURL = matches[0];

          $.get('/embedly/', {'url': potentialImageURL}, function (data, status) {

            if (status != 'success') {
              fallback();
              return;
            }

            if (data['type'] != 'image') {
              fallback();
              return;
            }

            // BAD BAD BAD BAD
            var extension = data['media']['url'].split('.').pop().split(/\#|\?/)[0].toLowerCase();

            createPost([
                {
                  'type': extension == 'gif' ? 'gif' : 'image',
                  'width': data['media']['width'],
                  'height': data['media']['height'],
                  'src': data['media']['url']
                }
            ]);
          });

          return;
        }

        fallback();
      }
    }
  });

  // TODO: Could be nicer...
  Interface.$content.on('dragover', function (e) {
    if (StreamToken) {
      $('#drag').removeClass('hidden');
    }
    return false;
  });

  Interface.$content.on('dragleave', function (e) {
    $('#drag').addClass('hidden');
  });

  Interface.$content.on('drop', function (e) {
    e.preventDefault();;
    $('#drag').addClass('hidden');

    if (e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.files.length > 0) {
      var file = e.originalEvent.dataTransfer.files[0];

      if(!file.type.match(/image.*/)){
        // must be an image
    		return;
    	}

      var reader = new FileReader();
      reader.addEventListener('load', function () {
        var imageData = reader.result.split(',')[1];
        $.ajax({
            url: '/imgur',
            type: 'POST',
            data: {
              image: imageData
            },
            dataType: 'json',
            success: function (response) {
              if (response['success']) {
                createPost([
                  {
                    'type': file.type == 'image/gif' ? 'gif' : 'image',
                    'width': response['data']['width'],
                    'height': response['data']['height'],
                    'src': response['data']['link']
                  }
                ]);
              }
            }
        });
      }, false);

      reader.readAsDataURL(file);
    }

    return false;
  });

  refresh();

  setInterval(function () {
    refresh();
  }, 30 * 1000)
});
