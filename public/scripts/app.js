$(function () {
  $(document).on('lazybeforeunveil', function (e) {
    var $element = $(e.target);
    if ($element.is('video')) {
      $element[0].play();
    }
  });

  var reloadTitle = function () {
    var freshCount = $('.contact.fresh').length;
    if (freshCount > 0) {
      document.title = 'Peach (' + freshCount + ')';
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

        // console.log(data);

        Interface.$sidebar = $('#sidebar');
        Interface.$content = $('#content');
        Interface.$header = $('#header');

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

  document.onkeydown = function (e) {
    switch (e.keyCode) {
      case 37:
        $('.contact.selected').prev().find('a').click();
        break;
      case 39:
        $('.contact.selected').next().find('a').click();
        break;
    }
  };

  refresh();

  setInterval(function () {
    refresh();
  }, 30 * 1000)
});
