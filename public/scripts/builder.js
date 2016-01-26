moment().format();

var FRAGMENT_ID = 0;

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

  CommentList: function (post) {
    var comments = [];
    if (post['comments']) {
      post['comments'].forEach(function (comment) {
        comments.push(Builder.Comment(comment))
      });
    }

    if (comments.length < 1) {
      return null;
    }

    return $(comments.join(''));
  },

  Comment: function (comment) {
    // <div class="comment clear">
    //   <div class="avatar" style="background-image: url(http://s3.amazonaws.com/assets.peachapi.com/25f25433510248b9ac0e262c162565a11453492637.jpg)"></div>
    //   <div class="details">
    //     <p class="author">Peter Woodman <span>@peterr</span></p>
    //     <p class="body">This is a comment.</p>
    //   </div>
    // </div>
    return '\
      <div class="comment clear"> \
        <div class="avatar" style="background-image: url(' + (comment['author']['avatarSrc'] || '')  + ')"></div> \
        <div class="details"> \
          <p class="author">' + comment['author']['displayName'] + ' <span>@' + comment['author']['name'] + '</span></p> \
          <p class="body">' + comment['body'] + '</p> \
        </div> \
      </div> \
    ';
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

    var assembleLikeString = function (post) {
      var likeString = 'Like';
      if (post['likeCount'] > 0) {
        if (post['likedByMe']) {
          likeString = 'Liked';
        }
        likeString += ' (' + post['likeCount'] + ')';
      }

      return '<div class="like' + (post['likedByMe'] ? ' liked' : '') + '"><a href="#">' + likeString + '</a></div>';
    };

    var commentString = 'Comment';
    if (post['commentCount'] > 0) {
      commentString += ' (' + post['commentCount'] + ')';
    }
    commentString = '<div class="comment"><a href="#">' + commentString + '</a></div>';

    var $post = $('\
      <div class="post" data-postid="' + post['id'] + '">' +
        fragments.join('') + '\
        <div class="footer">' +
          assembleLikeString(post) + commentString + '\
          <div>&mdash;</div> \
          <div>' + moment.unix(post['createdTime']).fromNow() + '</div> \
          <div class="delete"><a href="#">Delete</a></div> \
        </div> \
    ');

    var attachLikeAction = function () {
      $post.find('.like').click(function () {
        var postID = $(this).parent().parent().data('postid');
        var $likeButton = $(this);

        if (!$likeButton.hasClass('liked')) {
          post['likedByMe'] = true;
          post['likeCount']++;
          $likeButton.replaceWith($(assembleLikeString(post)));
          attachLikeAction();

          Request.withStreamToken('POST', 'like', {'postId': postID}, null);
        } else {
          post['likedByMe'] = false;
          post['likeCount']--;
          $likeButton.replaceWith($(assembleLikeString(post)));
          attachLikeAction();

          Request.withStreamToken('DELETE', 'like/postID/' + postID, null, null);
        }
        return false;
      });
    };

    var attachCommentAction = function () {
      $post.find('.comment').click(function () {
        var postID = $(this).parent().parent().data('postid');
        $(document).trigger('Peach.viewComments', postID);
        return false;
      });
    };

    var attachDeleteAction = function () {
      $post.find('.delete').click(function () {
        if (confirm('Are you sure?')) {
          var postID = $(this).parent().parent().data('postid');
          $(document).trigger('Peach.deletePost', postID);
          $(this).parent().parent().remove();
          return false;
        }
      });
    }

    attachLikeAction();
    attachCommentAction();
    attachDeleteAction();

    return $post;
  },

  Fragment: function (fragment) {
    var $fragment = null;

    switch (fragment['type']) {
      case 'text':
        var embedToAppend = null;
        FRAGMENT_ID++;
        var id = FRAGMENT_ID;
        $fragment = '\
          <div id="' + id + '" class="fragment text">' + Autolinker.link(fragment['text'], {
            'twitter': false,
            replaceFn: function (autolinker, match) {
              if (match.getType() == 'url') {
                embedToAppend = match.getUrl();
                $.get('/embedly/oembed', {'url': match.getUrl()}, function (data) {
                  if (data['html']) {
                    $('#' + id).append($('<div style="padding-top: 20px;">' + data['html'] + '</div>'));
                  }
                });
              }
              return true;
            }
          }) + '</div> \
        ';

        if (embedToAppend) {

          // $fragment.replace('<div ', '<div id="' + id + '" ');
;
        }

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
            <img class="lazyload" data-src="' + fragment['src']  + '" width="' + width + '" height="' + height + '"> \
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
          <div class="fragment video"> \
            <video loop muted class="lazyload" preload="none" width="' + width + '" height="' + height + '" poster="' + fragment['posterSrc'] + '"> \
              <source src="' + fragment['src']  + '"> \
            </video> \
          </div> \
        ';

        break;
    }

    return $fragment;
  }
};
