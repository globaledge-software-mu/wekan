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
		$('.myFolder').removeClass('selected');
		$(e.target).closest('li.myFolder').addClass('selected');

		//
	}
	
	
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





