SidebarFolder = null;

const defaultView = 'home';

BlazeComponent.extendComponent({
  mixins() {
    return [Mixins.InfiniteScrolling, Mixins.PerfectScrollbar];
  },

  onRendered() {
	if (!$('li.myFolder').hasClass('.selected')) {
	  $('li.uncategorised_boards').show();
	}

	$('ul.nav.metismenu#side-menu.folders').droppable({
      accept: 'li.board-color-belize', // accepts both categorised and uncategorised boards
      tolerance: 'pointer',
	  drop: function( event, ui ) {
        var droppedInFolderId = $('p#actionTitle').find('.fa-arrow-left').data('id');
        var boardIdentifier = $(ui.draggable).data('id');
        var fromFolderId = $(ui.draggable).closest('div.folderDetails').data('folder-id');

        // update old folder's record
        if ($('li.categorised_boards').is(':visible') && fromFolderId !== droppedInFolderId) {
          var fromFolder = Folders.findOne(fromFolderId);
          var folderContents = fromFolder.contents;
          var boardIds = new Array;

          for (var m = 0; m < _.keys(folderContents).length; m++) {
            if (folderContents[m].boardId !== boardIdentifier) {
              boardIds.push(folderContents[m].boardId);
            }
          }

          Folders.update(
      	    { _id : fromFolderId }, 
      		{ $unset: { contents : '' } }
          );

          for (var n = 0; n < boardIds.length; n++) {
            var keyName = 'contents.' + n + '.boardId';
        	Folders.update(
    	      { _id: fromFolderId },
              { $set: { [keyName] : boardIds[n] } }
    		);
          }
        }

        var droppedInFolder = Folders.findOne({_id: droppedInFolderId});
        var key = 0;
        if(typeof(droppedInFolder) != 'undefined' && droppedInFolder !== null) {
          var folderContents = droppedInFolder.contents;
          if(typeof(folderContents) != 'undefined' && folderContents !== null) {
            key = _.keys(folderContents).length;
          }
        }
        var keyName = 'contents.'+key+'.boardId';
        Folders.update(
          { _id: droppedInFolderId },
          { $set: { [keyName] : boardIdentifier } }
        );

        $(ui.draggable).remove();
	  }
	});

	$('a#uncategorisedBoardsFolder').droppable({
      accept: 'li.categorised_boards', // accepts only categorised boards
      tolerance: 'pointer',
	  drop: function( event, ui ) {
        var boardIdentifier = $(ui.draggable).data('id').trim();
        var fromFolderId = $(ui.draggable).closest('div.folderDetails').data('folder-id');

        var fromFolder = Folders.findOne({ _id:fromFolderId });
        var folderContents = fromFolder.contents;
        var boardIds = new Array;
        
        for (var v = 0; v < _.keys(folderContents).length; v++) {
          if (folderContents[v].boardId !== boardIdentifier) {
          	boardIds.push(folderContents[v].boardId);
          }
        }

    	Folders.update(
		  { _id : fromFolderId }, 
		  { $unset: { contents : '' } }
		);

    	for (var z = 0; z < boardIds.length; z++) {
          var keyName = 'contents.' + z + '.boardId';
      	  Folders.update(
  			{ _id: fromFolderId },
            { $set: { [keyName] : boardIds[z] } }
  		  );
    	}

        $(ui.draggable).remove();
	  }
	});
  },

  onCreated() {
    const initOpen = Utils.isMiniScreen() ? false : (!Session.get('currentCard'));
    this._isOpen = new ReactiveVar(initOpen);
    this._view = new ReactiveVar(defaultView);
    SidebarFolder = this;
    this.autorun(() => {
    	this.subscribe('folders');
    	this.subscribe('boards');
    });
  },

  onDestroyed() {
    Sidebar = null;
  },

  isOpen() {
    return this._isOpen.get();
  },

  open() {
    if (!this._isOpen.get()) {
      this._isOpen.set(true);
      EscapeActions.executeUpTo('detailsPane');
    }
  },

  hide() {
    if (this._isOpen.get()) {
      this._isOpen.set(false);
    }
  },

  toggle() {
    this._isOpen.set(!this._isOpen.get());
  },

  calculateNextPeak() {
    const altitude = this.find('.js-board-sidebar-content').scrollHeight;
    this.callFirstWith(this, 'setNextPeak', altitude);
  },

  reachNextPeak() {
    const activitiesComponent = this.childComponents('activities')[0];
    activitiesComponent.loadNextPage();
  },

  isTongueHidden() {
    return this.isOpen() && this.getView() !== defaultView;
  },

  scrollTop() {
    this.$('.js-board-sidebar-content').scrollTop(0);
  },

  getView() {
    return this._view.get();
  },

  setView(view) {
    view = _.isString(view) ? view : defaultView;
    if (this._view.get() !== view) {
      this._view.set(view);
      this.scrollTop();
      EscapeActions.executeUpTo('detailsPane');
    }
    this.open();
  },

  isDefaultView() {
    return this.getView() === defaultView;
  },

  getViewTemplate() {
    return `${this.getView()}SidebarFolder`;
  },

  showTongueTitle() {
    if (this.isOpen())
      return `${TAPi18n.__('sidebar-close')}`;
    else
      return `${TAPi18n.__('sidebar-open')}`;
  },
  
  folders() {
	return Folders.find(
	  { 
		userId: Meteor.userId(),
		parentId: null
	  }, 
	  { 
		sort: ['name'] 
	  }
	);
  },
  
  subFolders() {
	return Folders.find(
	  { 
		userId: Meteor.userId(),
		parentId: this.currentData()._id
	  }, 
	  { 
		sort: ['name'] 
	  }
	);
  },
  
  boards() {
	return Boards.find({'members.userId': Meteor.userId()});
  },

  events() {
    return [{
      'click .js-hide-sidebar': this.hide,
      'click .js-toggle-sidebar': this.toggle,
    }];
  },
}).register('sidebarFolder');

Blaze.registerHelper('SidebarFolder', () => SidebarFolder);

Template.foldersWidget.events({
  'click .create-first-level-folder': function() {
    if ($('.createFirstLevelFolderDiv').hasClass('hide')) {
      $('.createFirstLevelFolderDiv').removeClass('hide');
      $('#createFirstLevelFolderForm').find('#title').focus();
    } else {
      $('.createFirstLevelFolderDiv').addClass('hide');
      $('#createFirstLevelFolderForm').trigger('reset');
    }
  },

  'click .close-first-level-form': function() {
    $('.createFirstLevelFolderDiv').addClass('hide');
    $('#createFirstLevelFolderForm').trigger('reset');
  },

  'submit #createFirstLevelFolderForm': function(e) {
    e.preventDefault();
    Folders.insert({ 
      name: $('input[name=name]').val(), 
      level: "first", 
      userId: Meteor.userId()
    }, function(error, result) {
      if (result) {
        var $successMessage = $('<div class="successStatus">' + 
          '<a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a>' +
          '<p><b>Folder succesfully created!</b></p>' + 
          '</div>'
        );

        $('#header-main-bar').before($successMessage);
        $successMessage.delay(10000).slideUp(500, function() {
          $(this).remove();
        });
        return false;
      } else if (error) {
        var $errorMessage = $('<div class="errorStatus">' +
          '<a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a>' +
          '<p><b>Error! Folder was not created!</b></p>' +
          '</div>'
        );

        $('#header-main-bar').before($errorMessage);
        $errorMessage.delay(10000).slideUp(500, function() {
          $(this).remove();
        });
      }
    });

    $('.createFirstLevelFolderDiv').addClass('hide');
    $('#createFirstLevelFolderForm').trigger('reset');
  },

  'click .addSubFolderTAGli, .addSubFolderTAGi, .addSubFolderLink': function(e) {
	var selector = $(e.target).closest('ul.nav.nav-second-level.collapse');
    if (selector.find('.createSubFolderFormTAGli').hasClass('hide')) {
      selector.find('.createSubFolderFormTAGli').removeClass('hide');
      selector.find('#createSubFolderForm').find('#title').focus();
    } else {
      selector.find('.createSubFolderFormTAGli').addClass('hide');
      selector.find('#createSubFolderForm').trigger('reset');
    }
  },

  'click .close-sub-folder-form': function(e) {
    $(e.target).closest('.createSubFolderFormTAGli').addClass('hide');
    $(e.target).closest('#createSubFolderForm').trigger('reset');
  },

  'submit #createSubFolderForm': function(e) {
    e.preventDefault();
    Folders.insert({ 
      name: $(e.target).find('input[name=name]').val(), 
      level: "second", 
      userId: Meteor.userId(),
      parentId: $(e.target).data('parent-id')
    }, function(error, result) {
      if (result) {
        var $successMessage = $('<div class="successStatus">' + 
          '<a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a>' +
          '<p><b>Folder succesfully created!</b></p>' + 
          '</div>'
        );

        $('#header-main-bar').before($successMessage);
        $successMessage.delay(10000).slideUp(500, function() {
          $(this).remove();
        });
        return false;
      } else if (error) {
        var $errorMessage = $('<div class="errorStatus">' +
          '<a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a>' +
          '<p><b>Error! Folder was not created!</b></p>' +
          '</div>'
        );

        $('#header-main-bar').before($errorMessage);
        $errorMessage.delay(10000).slideUp(500, function() {
          $(this).remove();
        });
      }
    });

    $(e.target).closest('.createSubFolderFormTAGli').addClass('hide');
    $(e.target).trigger('reset');
  },

  'click .deleteFolder': function() {
	if (this._id != 'undefined' && this._id !== null) {
      var folderIds = new Array;
      folderIds.push(this._id);

      var subFolders = Folders.find({parentId: this._id}).fetch();
	  if(typeof(subFolders) != 'undefined' && subFolders !== null && subFolders.length > 0) {
        for (var i=0; i < subFolders.length; i++) {
		  folderIds.push(subFolders[i]._id);
		}
	  }

	  for (var k=0; k < folderIds.length; k++) {
	    Folders.remove(folderIds[k]);
      }
	}

    if (!$('li.myFolder').hasClass('selected')) {
      $('a#uncategorisedBoardsFolder').trigger('click');
    }
  },

  'click a.folderOpener': function(e) {
	var selector = $(e.target).closest('li.myFolder').find('.folderHandle');

	if (selector.hasClass('fa-caret-right')) {
      selector.removeClass('fa-caret-right');
	  selector.addClass('fa-caret-down');
      $(e.target).closest('li.myFolder').find('ul.nav.nav-second-level.collapse').removeClass('hide');
	} else if (selector.hasClass('fa-caret-down')) {
	  selector.removeClass('fa-caret-down');
	  selector.addClass('fa-caret-right');
	  $(e.target).closest('li.myFolder').find('ul.nav.nav-second-level.collapse').addClass('hide');
	}

	if (!$(e.target).closest('li.myFolder').hasClass('selected')) {
	  $('a#uncategorisedBoardsFolder').closest('li').removeClass('selected');
	  $('.myFolder').removeClass('selected');
	  $(e.target).closest('li.myFolder').addClass('selected');
	}

	if ($(e.target).closest('li.myFolder').hasClass('selected')) {
	  var folderId = $(e.target).closest('li.myFolder').data('id');
	  var boardIds = new Array();
	  var selectedFolder = Folders.findOne({ _id:folderId }); 
      var folderContents = selectedFolder.contents;

      $('li.js-add-board, li.uncategorised_boards, li.categorised_boards').hide();
	  $('.emptyFolderMessage').remove();

	  if(typeof(folderContents) != 'undefined' && folderContents !== null && _.keys(folderContents).length > 0) {
		for (var i=0; i < _.keys(folderContents).length; i++) {
		  boardIds.push(folderContents[i].boardId);
		}

		for (var k=0; k < boardIds.length; k++) {
	      $('li.categorised_boards[data-id="' + boardIds[k] + '"]').show();
		}

		$('li.categorised_boards').draggable({
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
	  } else {
		$('.board-list.clearfix.ui-sortable').append(
		  '<h3 class="emptyFolderMessage">Folder is empty!</h3>'
		);
	  }
  	}
  },

  'click a#uncategorisedBoardsFolder': function() {
	$('li.myFolder').removeClass('selected');
	$('a#uncategorisedBoardsFolder').closest('li').addClass('selected');
	$('.emptyFolderMessage').remove();
    $('li.categorised_boards').hide();
    $('li.js-add-board, li.uncategorised_boards').show();
  },

  'mouseover a#uncategorisedBoardsFolder': function(e) {
	if ($('li.categorised_boards').is(':visible')) {
	  $('p#actionTitle').addClass('pull-right');
      $('p#actionTitle').html('<span class="fa fa-arrow-left" data-id="drop-in-uncategorised"> </span><b> Remove from folder</b>');
	} else {
	  return false;
	}
  },

  'mouseout a#uncategorisedBoardsFolder': function(e) {
	$('p#actionTitle').removeClass('pull-right');
    $('p#actionTitle').html('<span class="fa fa-arrow-left"> </span><b> Drop in a folder</b>');
  },

  'mouseover .myFolder': function(e) {
	var folderId;
	var folderName;

	if ($(e.target).hasClass('myFolder')) {
      folderId = $(e.target).data('id');
	  folderName = $(e.target).data('name');
	} else {
	  folderId = $(e.target).closest('.myFolder').data('id');
	  folderName = $(e.target).closest('.myFolder').data('name');
	}

    $('p#actionTitle').html('<span class="fa fa-arrow-left" data-id="' + folderId + '"> </span><b> Drop in ' + folderName + '</b>');
  },

  'mouseout .myFolder': function(e) {
    $('p#actionTitle').html('<span class="fa fa-arrow-left"> </span><b> Drop in a folder</b>');
  },
});





