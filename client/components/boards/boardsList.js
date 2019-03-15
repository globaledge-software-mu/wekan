const subManager = new SubsManager();

BlazeComponent.extendComponent({
  onCreated() {
    Meteor.subscribe('setting');
    Meteor.subscribe('folders');
  },

  onRendered() {
	$('ul.board-list.clearfix').sortable();
	$('li.board-color-belize').draggable({
	  revert: 'invalid',
	  start: function(event) {
        $(this).css({'opacity': '0.5', 'pointer-events': 'none'});
        $(this).append($('<p id="actionTitle" class="center"><span class="fa fa-arrow-left"> </span><b> Drop in a folder</b></p>').css('color', '#2980b9'));
	  },
	  drag: function() {
		//
	  },
	  stop: function() {
	    $(this).css({'opacity': '1', 'pointer-events': 'auto'});
        $('p#actionTitle').remove();
	  }
	});
  },

  boards() {
    return Boards.find({
      archived: false,
      'members.userId': Meteor.userId(),
    }, {
      sort: ['title'],
    });
  },

  folderBoards() {
    var folderId = $('li.myFolder.selected').data('id');
    if (folderId !== null) {
      var currentFolder = Folders.find({ _id: folderId }).fetch();
      var folderBoardsIds = new Array;

      if (currentFolder.length > 0) {
    	var folderContents = currentFolder[0].contents;
    	if (typeof(folderContents) != 'undefined' && folderContents !== null && _.keys(folderContents).length > 0) {
    	  for (var j=0; j < _.keys(folderContents).length; j++) {
    	    folderBoardsIds.push(folderContents[j].boardId);
          }
    	}
      }

      if (folderBoardsIds.length > 0) {
    	return Boards.find({
          _id: { $in: folderBoardsIds },
          archived: false,
          'members.userId': Meteor.userId(),
        }, {
          sort: ['title'],
        });
      } else {
        return null
      }
    } else {
        return null
    }
  },

  uncategorisedBoards() {
	var userFolders = Folders.find({ userId: Meteor.userId() }).fetch();
	var categorisedBoardIds = new Array;

	if (userFolders.length > 0) {
	  for (var i=0; i < userFolders.length; i++) {
	    var folderContents = userFolders[i].contents;
	    if (typeof(folderContents) != 'undefined' && folderContents !== null && _.keys(folderContents).length > 0) {
		  for (var j=0; j < _.keys(folderContents).length; j++) {
	        categorisedBoardIds.push(folderContents[j].boardId);
		  }
	    }
	  }
	}

	if (categorisedBoardIds.length > 0) {
	  return Boards.find({
        _id: { $nin: categorisedBoardIds },
        archived: false,
        'members.userId': Meteor.userId(),
      }, {
        sort: ['title'],
      });
	} else {
	  return Boards.find({
        archived: false,
        'members.userId': Meteor.userId(),
      }, {
        sort: ['title'],
      });
	}
  },

  isStarred() {
    const user = Meteor.user();
    return user && user.hasStarred(this.currentData()._id);
  },

  hasOvertimeCards() {
    subManager.subscribe('board', this.currentData()._id);
    return this.currentData().hasOvertimeCards();
  },

  hasSpentTimeCards() {
    subManager.subscribe('board', this.currentData()._id);
    return this.currentData().hasSpentTimeCards();
  },

  isInvited() {
    const user = Meteor.user();
    return user && user.isInvitedTo(this.currentData()._id);
  },

  events() {
    return [{
      'click .js-add-board': Popup.open('createBoard'),
      'click .js-star-board'(evt) {
        const boardId = this.currentData()._id;
        Meteor.user().toggleBoardStar(boardId);
        evt.preventDefault();
      },
      'click .js-accept-invite'() {
        const boardId = this.currentData()._id;
        Meteor.user().removeInvite(boardId);
      },
      'click .js-decline-invite'() {
        const boardId = this.currentData()._id;
        Meteor.call('quitBoard', boardId, (err, ret) => {
          if (!err && ret) {
            Meteor.user().removeInvite(boardId);
            FlowRouter.go('home');
          }
        });
      },
    }];
  },
}).register('boardList');
