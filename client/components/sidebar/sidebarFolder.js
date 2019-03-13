SidebarFolder = null;

const defaultView = 'home';

BlazeComponent.extendComponent({
  mixins() {
    return [Mixins.InfiniteScrolling, Mixins.PerfectScrollbar];
  },

  onRendered() {
	$('ul.nav.metismenu#side-menu.folders').droppable({
      accept: 'li.board-color-belize',
      tolerance: 'pointer',
	  drop: function( event, ui ) {
        var folderIdentifier = $('p#actionTitle').find('.fa-arrow-left').data('id');
        var boardIdentifier = $(ui.draggable).find('a').data('id');

        var folderContents = (Folders.findOne({_id: folderIdentifier})).contents;
        var key = 0;
        if(typeof(folderContents) != 'undefined' && folderContents !== null) {
          key = _.keys(folderContents).length;
        }
        var keyName = 'contents.'+key+'.boardId';

        Folders.update(
          { _id: folderIdentifier },
          { $set: { [keyName] : boardIdentifier } }
        );

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
	return Folders.find({userId: Meteor.userId()});
  },
  
  boards() {
	return Boards.find({'members.userId': Meteor.userId()});
  },

  folderBoards() {
	var currentFolder = Folders.find({ _id: this.currentData()._id }).fetch();
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

  'click .close-form': function() {
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

  'click .deleteFolder': function() {
    Folders.remove({ _id: this._id }, function(error, result) {
      if (result) {
        var $successMessage = $('<div class="successStatus">' + 
          '<a href="#" class="pull-right closeStatus" data-dismiss="alert" aria-label="close">&times;</a>' +
          '<p><b>Deleted folder!</b></p>' + 
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
          '<p><b>Error! Folder could not be deleted!</b></p>' +
          '</div>'
        );

        $('#header-main-bar').before($errorMessage);
        $errorMessage.delay(10000).slideUp(500, function() {
          $(this).remove();
        });
      }
    });
  },

  'click a.folderOpener': function(event) {
	var selector = $(event.target).closest('li.myFolder').find('.folderHandle');
	if (selector.hasClass('fa-caret-right')) {
      selector.removeClass('fa-caret-right');
	  selector.addClass('fa-caret-down');
      $(event.target).parents('li.myFolder').find('ul.nav.nav-second-level.collapse').removeClass('hide');
	} else if (selector.hasClass('fa-caret-down')) {
	  selector.removeClass('fa-caret-down');
	  selector.addClass('fa-caret-right');
	  $(event.target).parents('li.myFolder').find('ul.nav.nav-second-level.collapse').addClass('hide');
	}
  },

  'mouseover .myFolder': function(event) {
    $('i.fa-folder:contains("'+ this.name +'")').closest('li.myFolder').css('background-color', '#f0f0f0');
    $('p#actionTitle').html('<span class="fa fa-arrow-left" data-id="' + this._id + '"> </span><b> Drop in ' + this.name + '</b>');
  },

  'mouseout .myFolder': function(event) {
	$('i.fa-folder:contains("'+ this.name +'")').closest('li.myFolder').css('background-color', '#f7f7f7');
    $('p#actionTitle').html('<span class="fa fa-arrow-left"> </span><b> Drop in a folder</b>');
  },
});





