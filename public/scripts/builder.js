moment().format();

var Builder = {
  SidebarElement: function (connection) {
    var isFresh = false;
    var postLength = connection['posts'].length;
    if (postLength > 0) {
      isFresh = connection['posts'][postLength - 1]['isUnread'];
    }

    var $contact = $('\
      <li class="contact' + (isFresh ? ' fresh' : '') + '" data-id="' + connection['id'] + '"> \
        <a href="#"> \
          <div class="avatar" style="background-image: url(' + (connection['avatarSrc'] || '') + ')"></div> \
          <div class="name">' + connection['displayName'] + '</div> \
        </a> \
    ');

    return $contact;
  },

  Header: function (stream) {
    return $('<h1>' + stream['displayName'] + ' <span>@' + stream['name'] + '</span> <span class="bio">' + stream['bio'] + '</span></h1>');
  },

  NewPostsIndicator: function () {
    return $('<div class="new-posts"><span>New Posts</span></div>');
  },

  Post: function (post) {
    var fragments = [];
    post['message'].forEach(function (fragment) {
      if ($fragment = Builder.Fragment(fragment)) {
        fragments.push($fragment);
      }
    });

    if (fragments.length < 1) {
      return null;
    }

    var likeString = 'Like';
    if (post['likeCount'] > 0) {
      likeString += ' (' + post['likeCount'] + ')';
    }

    var commentString = 'Comment';
    if (post['commentCount'] > 0) {
      commentString += ' (' + post['commentCount'] + ')';
    }

    var $post = $('\
      <div class="post">' +
        fragments.join("\n") + '\
        <div class="footer"> \
          <div>' + likeString + '</div> \
          <div>' + commentString + '</div> \
          <div>&mdash;</div> \
          <div>' + moment.unix(post['createdTime']).fromNow() + '</div> \
        </div> \
    ');

    return $post;
  },

  Fragment: function (fragment) {
    var $fragment = null;

    switch (fragment['type']) {
      case 'text':
        $fragment = '\
          <div class="fragment text">' + Autolinker.link(fragment['text'], {'twitter': false}) + '</div> \
        ';
        break;

      case 'music':
        $fragment = '\
          <div class="fragment text">' + fragment['title'] + '</div> \
        ';
        break;

      case 'location':
        $fragment = '\
          <div class="fragment text">📍 ' + fragment['name'] + '</div> \
        ';
        break;

      case 'image':
      case 'gif':
        var width = 400;
        var height = 275;
        if (fragment['width'] && fragment['height']) {
          var ratio = 400 / fragment['width'];
          height = Math.round(fragment['height'] * ratio);
        }

        $fragment = '\
          <div class="fragment image"> \
            <img src="' + fragment['src']  + '" width="' + width + '" height="' + height + '"> \
          </div> \
        ';

        break;

      case 'video':
        var width = 400;
        var height = 275;
        if (fragment['width'] && fragment['height']) {
          var ratio = 400 / fragment['width'];
          height = Math.round(fragment['height'] * ratio);
        }

        $fragment = '\
          <div class="fragment image"> \
            <video autoplay loop muted width="' + width + '" height="' + height + '" poster="' + fragment['posterSrc'] + '"> \
              <source src="' + fragment['src']  + '"> \
            </video> \
          </div> \
        ';

        break;
    }

    return $fragment;
  }
};
