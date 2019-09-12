const subManager = new SubsManager();

Template.boardListHeaderBar.events({
  'click .js-open-archived-board'() {
    Modal.open('archivedBoards');
  },
});

Template.boardListHeaderBar.helpers({
  templatesBoardId() {
    return Meteor.user().getTemplatesBoardId();
  },
  templatesBoardSlug() {
    return Meteor.user().getTemplatesBoardSlug();
  },
});

BlazeComponent.extendComponent({
  onCreated() {
    Meteor.subscribe('setting');
    Meteor.subscribe('folders');
  },

  onRendered() {
  	$('ul.board-list.clearfix').sortable({ cancel: '.js-toggle-sidebar' });

  	$('li.uncategorised_boards').draggable({
  	  revert: 'invalid',
  	  start: function(event) {
          $(this).css({'opacity': '0.5', 'pointer-events': 'none'});
          $(this).append($('<p id="actionTitle" class="center"><span class="fa fa-arrow-left"> </span><b> Drop in a folder</b></p>').css('color', '#2980b9'));
  	  },
  	  drag: function() {},
  	  stop: function() {
  	    $(this).css({'opacity': '1', 'pointer-events': 'auto', 'height': 'auto'});
        $('p#actionTitle', this).remove();
  	  }
  	});

  	// part of the codes for the functionality of dragging boards onto boards
/*  	$('li.board-color-belize').droppable({
      accept: 'li.board-color-belize', 
      tolerance: 'pointer',
      drop: function( event, ui ) {
    		var draggedBoardId = $(ui.draggable).data('id');
    		var droppedOnBoardId = $(this).data('id');

  	    Modal.open('createNewFolder');

  	    sessionStorage.setItem('draggedBoardId',  draggedBoardId);
  	    sessionStorage.setItem('droppedOnBoardId',  droppedOnBoardId);
  	  }
  	});*/
  },

  boards() {
    return Boards.find({
      archived: false,
      'members.userId': Meteor.userId(),
      type: 'board',
    }, { sort: ['title'] });
  },

  folders() {
  	return Folders.find({
  	  userId: Meteor.userId()
	  }, {
	    sort: ['name']
	  });
  },

  boardTemplates() {
    return Boards.find({
      type: 'template-board',
      'members.userId': Meteor.userId(),
      archived: false, 
    });
  },

  folderBoards() {
    var folderId = this.currentData()._id;

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
        return Boards.find(
          { _id: { $in: folderBoardsIds }, archived: false, 'members.userId': Meteor.userId(), }, 
          { sort: ['title'], }
        );
      } else {
        return null
      }
    } else {
        return null
    }
  },

  uncategorisedBoards() {
    if (!$('li.myFolder').children('a.folderOpener').hasClass('selected') && !$('a#templatesFolder').hasClass('selected')) {
      $('a#uncategorisedBoardsFolder').trigger('click');
    }
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

    var uncategorisedBoardsDetails = Boards.find({ 
        _id: { $nin: categorisedBoardIds }, 
        archived: false, 
        'members.userId': Meteor.userId(), 
        type: {$ne: 'template-board'},
      }, 
      {fields: {'_id': 1}}
    ).fetch();
    var uncategorisedBoardIds = new Array();

    for (var i=0; i < uncategorisedBoardsDetails.length; i++) {
      uncategorisedBoardIds.push(uncategorisedBoardsDetails[i]._id);
    }

    return Boards.find(
      { _id: { $in: uncategorisedBoardIds }, archived: false, 'members.userId': Meteor.userId(), }, 
      { sort: ['title'], }
    );
  },

  isStarred() {
    const user = Meteor.user();
    return user && user.hasStarred(this.currentData()._id);
  },

  hasOvertimeCards() {
    subManager.subscribe('board', this.currentData()._id, false);
    return this.currentData().hasOvertimeCards();
  },

  hasSpentTimeCards() {
    subManager.subscribe('board', this.currentData()._id, false);
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
      'click .js-clone-board'(evt) {
        Meteor.call('cloneBoard',
          this.currentData()._id,
          Session.get('fromBoard'),
          {},
          (err, res) => {
            if (err) {
              this.setError(err.error);
            } else {
              Session.set('fromBoard', null);
              Utils.goBoardId(res);
            }
          }
        );
        evt.preventDefault();
      },
      'click .js-archive-board'(evt) {
        const boardId = this.currentData()._id;
        Meteor.call('archiveBoard', boardId);
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
      'click .sidebar-folder-tongue': function(e) {
        var selector = $('.sidebar-folder-tongue').children();
        if (selector.hasClass('fa-angle-left')) {
          // close sidebar
          $('.board-widget-folders').hide();
          $('.sidebar-folder-tongue').css('left', '7px');
        } else if (selector.hasClass('fa-angle-right')) {
          // open sidebar
          $('.board-widget-folders').show();
          $('.sidebar-folder-tongue').css('left', '-8px');
        }
        selector.toggleClass('fa-angle-right fa-angle-left');
        $('.board-list.clearfix').toggleClass('col-md-8 col-md-11');
      },
    }];
  },
}).register('boardList');

Template.createNewFolder.events({
  'submit #createFolderForBoardsDroppedOnEachOther': function(e) {
    e.preventDefault();

    Modal.close('createNewFolder');

    var newDoc = Folders.insert({ 
      name: $(e.target).find('input[name=name]').val(), 
      level: 'first', 
      userId: Meteor.userId()
    }, function(error) {
      if (error) {
        var $errorMessage = $('<div class="errorStatus">' +
          '<a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a>' +
          '<p><b>Error! Folder could not be created!</b></p>' +
          '</div>'
        );

        $('#header-main-bar').before($errorMessage);
        $errorMessage.delay(10000).slideUp(500, function() {
          $(this).remove();
        });

        return false;
      }
    });
    
    var folderId = newDoc;
    var boardIds = new Array;
    boardIds.push(sessionStorage.getItem('draggedBoardId'));
    boardIds.push(sessionStorage.getItem('droppedOnBoardId'));
    sessionStorage.removeItem('draggedBoardId');
    sessionStorage.removeItem('droppedOnBoardId');

    for (var i = 0; i < boardIds.length; i++) {
      var keyName = 'contents.' + i + '.boardId';
      Folders.update(
  	    { _id: folderId },
        { $set: { [keyName] : boardIds[i] } }
  	  );
    }

    var $successMessage = $('<div class="successStatus">' + 
      '<a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a>' +
      '<p><b>Folder was succesfully created and the boards have been moved into it!</b></p>' + 
      '</div>'
    );

    $('#header-main-bar').before($successMessage);
    $successMessage.delay(10000).slideUp(500, function() {
      $(this).remove();
    });
  },

  'click #cancelCreateFolderForBoardsDraggedOnEachOther': function(e) {
    Modal.close('createNewFolder');
    $('#'+draggedBoardId).animate({
      top: "0px",
      left: "0px"
    });
  },
});
