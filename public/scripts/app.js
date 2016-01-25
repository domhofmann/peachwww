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

        // I'm writing this post from a computer. 😱

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
          Interface.$compose.find('input').val('');

          message = [
            {'type': 'text', 'text': text}
          ];

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

          Request.withStreamToken('POST', 'post', {
            'message': message
          }, {
            success: function (data) {
              $post.data('postid', data['data']['id']);
            }
          });
        }
    }
  });

  refresh();

  setInterval(function () {
    refresh();
  }, 30 * 1000)
});
