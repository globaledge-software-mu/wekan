const defaultView = 'home';

BlazeComponent.extendComponent({
  mixins() {
    return [Mixins.InfiniteScrolling, Mixins.PerfectScrollbar];
  },

  onRendered() {
    // turning the Categorised Folder(s) into droppable(s)
  	$('ul.nav.metismenu#side-menu.folders').droppable({
  	  // accepts all three Template, Uncategorised and Categorised Folders Boards
      accept: 'li.board-color-belize', 
      tolerance: 'pointer',
      drop: function( event, ui ) {
        var droppedInFolderId = $('p#actionTitle').find('.fa-arrow-left').data('id');
        var boardIdentifier = $(ui.draggable).data('id');
        var fromFolderId = $(ui.draggable).closest('div.folderDetails').data('folder-id');
  
        // Update old folder's contents
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

        // Update new folder's contents (Boards could be from uncategorised or another categorised folder)
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

        // If board is being dropped from template folder
        if ($('li.board_templates').is(':visible')) {
          // update board, changing the template board back to a regular one
          Boards.update(
            { _id: boardIdentifier },
            { $set: { type : 'board' } }
          );

          // removing the board template linked card since the 
          // board that it represented has been changed to a regular one
          var linkedCard = Cards.findOne({linkedId: boardIdentifier});
          if (linkedCard && linkedCard._id && linkedCard._id !== 'undefined' && linkedCard._id !== null) {
            Cards.remove(linkedCard._id);
          }
        }

        // if categorised boards is being displayed, have the selected folder be clicked again
        if ($('li.categorised_boards').is(':visible')) {
          $('a.folderOpener.selected').trigger('click');
        }
  	  }
  	});

    // turning the Uncategorised Folder into droppable
  	$('a#uncategorisedBoardsFolder').droppable({
      accept: 'li.categorised_boards, li.board_templates', // accepts only categorised and template boards
      tolerance: 'pointer',
  	  drop: function( event, ui ) {
        var boardIdentifier = $(ui.draggable).data('id').trim();
        var fromFolderId = $(ui.draggable).closest('div.folderDetails').data('folder-id');

        // Update old folder's contents
        var fromFolder = Folders.findOne({ _id:fromFolderId });
        if (fromFolder && fromFolder.contents) {
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
        }

        // update board, changing the template board back to a regular one
        Boards.update(
          { _id: boardIdentifier },
          { $set: { type : 'board' } }
        );

        // removing the board template linked card since the 
        // board that it represented has been changed to a regular one
        var linkedCard = Cards.findOne({linkedId: boardIdentifier});
        if (linkedCard && linkedCard._id && linkedCard._id !== 'undefined' && linkedCard._id !== null) {
          Cards.remove(linkedCard._id);
        }

        // if categorised boards is being displayed, have the selected folder be clicked again
        if ($('li.categorised_boards').is(':visible')) {
          $('a.folderOpener.selected').trigger('click');
        }
  	  }
  	});

    // turning the Template Folder into droppable
    $('a#templatesFolder').droppable({
      accept: 'li.board-color-belize', // accepts any board
      tolerance: 'pointer',
      drop: function( event, ui ) {
        var boardIdentifier = $(ui.draggable).data('id').trim();
        var boardTitle = $(ui.draggable).data('title').trim();
        var fromFolderId = $(ui.draggable).closest('div.folderDetails').data('folder-id');

        var fromFolder = Folders.findOne({ _id:fromFolderId });
        if (fromFolder && fromFolder.contents) {
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
        }

        // update board
        Boards.update(
          { _id: boardIdentifier },
          { $set: { type : 'template-board' } }
        );

        // create card
        // We need this, because as per upstream logic they'll query for the card that gets created by default 
        // whenever the user creates a templates for when the system tries to list all the templates in 
        // feature to create boards with template
        var linkedCard = Cards.findOne({linkedId: boardIdentifier});
        if (!linkedCard) {
          const sortIndex = -1;
          Cards.insert({
            title: boardTitle,
            boardId: boardIdentifier,
            type: 'cardType-linkedBoard',
            linkedId: boardIdentifier,
            sort: sortIndex,
          });
        }

        // if categorised boards is being displayed, have the selected folder be clicked again
        if ($('li.categorised_boards').is(':visible')) {
          $('a.folderOpener.selected').trigger('click');
        }
      }
    });

    if (!$('li.myFolder').children('a.folderOpener').hasClass('selected') && !$('a#templatesFolder').hasClass('selected')) {
      $('a#uncategorisedBoardsFolder').trigger('click');
    }
  },

  onCreated() {
    const initOpen = Utils.isMiniScreen() ? false : (!Session.get('currentCard'));
    this._isOpen = new ReactiveVar(initOpen);
    this._view = new ReactiveVar(defaultView);
    FoldersWidget = this;
    this.autorun(() => {
    	this.subscribe('folders');
    	this.subscribe('boards');
    });
  },

  calculateNextPeak() {
    const altitude = this.find('.js-board-sidebar-content').scrollHeight;
    this.callFirstWith(this, 'setNextPeak', altitude);
  },

  reachNextPeak() {
    const activitiesComponent = this.childComponents('activities')[0];
    activitiesComponent.loadNextPage();
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
    return `${this.getView()}FoldersWidget`;
  },
  
  folders() {
  	return Folders.find(
  	  { userId: Meteor.userId(), parentId: null }, 
  	  { sort: ['name'] }
  	);
  },
  
  subFolders() {
  	return Folders.find(
  	  { userId: Meteor.userId(), parentId: this.currentData()._id }, 
  	  { sort: ['name'] }
  	);
  },
  
  boards() {
    return Boards.find({'members.userId': Meteor.userId()});
  },

  events() {
    return [{
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

      'click .addSubFolderLink': function(e) {
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
        if (this.currentData()._id !== 'undefined' && this.currentData()._id !== null) {
          var folderIds = new Array;
          folderIds.push(this.currentData()._id);

          var subFolders = Folders.find({parentId: this.currentData()._id}).fetch();
          if(typeof(subFolders) != 'undefined' && subFolders !== null && subFolders.length > 0) {
            for (var i=0; i < subFolders.length; i++) {
              folderIds.push(subFolders[i]._id);
            }
          }

          for (var k=0; k < folderIds.length; k++) {
            Folders.remove(folderIds[k]);
          }
        }

        if (!$('li.myFolder').children('a.folderOpener').hasClass('selected') && !$('a#templatesFolder').hasClass('selected')) {
          $('a#uncategorisedBoardsFolder').trigger('click');
        }
      },

      // toggles caret icon & expands parent folder
      'click i.folderHandle': function(e) {
        if ($(e.target).hasClass('fa-caret-right')) {
          $(e.target).removeClass('fa-caret-right');
          $(e.target).addClass('fa-caret-down');
          $(e.target).closest('li.myFolder').find('ul.nav.nav-second-level.collapse').removeClass('hide');
        } else if ($(e.target).hasClass('fa-caret-down')) {
          $(e.target).removeClass('fa-caret-down');
          $(e.target).addClass('fa-caret-right');
          $(e.target).closest('li.myFolder').find('ul.nav.nav-second-level.collapse').addClass('hide');
        }
      },

      // selecting folder & displaying its boards
      'click a.folderOpener': function(e) {
        Popup.close();
        if (!$(e.target).closest('li.myFolder').children('a.folderOpener').hasClass('selected')) {
          $('a#uncategorisedBoardsFolder, a#templatesFolder').removeClass('selected');
          $('a.folderOpener').removeClass('selected');
          $(e.target).closest('li.myFolder').children('a.folderOpener').addClass('selected');
        }

        if ($(e.target).closest('li.myFolder').children('a.folderOpener').hasClass('selected')) {
          var folderId = $(e.target).closest('li.myFolder').data('id');
          var boardIds = new Array();
          var selectedFolder = Folders.findOne({ _id:folderId }); 
          var folderContents = selectedFolder.contents;

          $('li.js-add-board, li.js-add-board-template, li.uncategorised_boards, li.categorised_boards, li.board_templates').hide();
          $('.emptyFolderMessage').remove();

          if(typeof(folderContents) != 'undefined' && folderContents !== null && _.keys(folderContents).length > 0) {
            for (var i=0; i < _.keys(folderContents).length; i++) {
              boardIds.push(folderContents[i].boardId);
            }

            for (var k=0; k < boardIds.length; k++) {
                $('li.categorised_boards[data-id="' + boardIds[k] + '"]').show();
            }

            // making the selected folder's displayed boards draggable
            $('li.categorised_boards').draggable({
              revert: 'invalid',
              start: function(event) {
                $(this).css({'opacity': '0.5', 'pointer-events': 'none'});
                $(this).append($('<p id="actionTitle" class="center"><span class="fa fa-arrow-left"> </span><b> Drop in a folder</b></p>').css('color', '#2980b9'));
              },
              drag: function() {},
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

      'click a#templatesFolder': function() {
        Popup.close();
        $('a.folderOpener, a#uncategorisedBoardsFolder').removeClass('selected');
        $('a#templatesFolder').addClass('selected');
        $('.emptyFolderMessage').remove();
        $('li.js-add-board, li.uncategorised_boards, li.categorised_boards').hide();
        $('li.js-add-board-template, li.board_templates').show();
        var boardTemplates = Boards.find({
          type: 'template-board',
          'members.userId': Meteor.userId(),
          archived: false, 
        });
        if(typeof(boardTemplates) != 'undefined' && boardTemplates !== null && _.keys(boardTemplates).length > 0) {
          // making the board templates draggable
          $('li.board_templates').draggable({
            revert: 'invalid',
            start: function(event) {
              $(this).css({'opacity': '0.5', 'pointer-events': 'none'});
              $(this).append($('<p id="actionTitle" class="center"><span class="fa fa-arrow-left"> </span><b> Drop in a folder</b></p>').css('color', '#2980b9'));
            },
            drag: function() {},
            stop: function() {
              $(this).css({'opacity': '1', 'pointer-events': 'auto'});
              $('p#actionTitle').remove();
            }
          });
        } else {
          return false;
        }
      },

      'click a#uncategorisedBoardsFolder': function() {
        Popup.close();
        $('a.folderOpener, a#templatesFolder').removeClass('selected');
        $('a#uncategorisedBoardsFolder').addClass('selected');
        $('.emptyFolderMessage').remove();
        $('li.js-add-board-template, li.categorised_boards, li.board_templates').hide();
        $('li.js-add-board, li.uncategorised_boards').show();
      },

      'mouseover a#templatesFolder': function(e) {
        if ($('li.board_templates').not(':visible')) {
          $('p#actionTitle').addClass('pull-right');
          $('p#actionTitle').html('<span class="fa fa-arrow-left" data-id="drop-in-uncategorised"> </span><b> Drop in Templates folder</b>');
        } else {
          return false;
        }
      },

      'mouseover a#uncategorisedBoardsFolder': function(e) {
        if ($('li.uncategorised_boards').not(':visible')) {
          $('p#actionTitle').addClass('pull-right');
          $('p#actionTitle').html('<span class="fa fa-arrow-left" data-id="drop-in-uncategorised"> </span><b> Drop in Uncategorised folder</b>');
        } else {
          return false;
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

      'mouseout .myFolder, mouseout #uncategorisedBoardsFolder, mouseout #templatesFolder': function(e) {
        $('p#actionTitle').removeClass('pull-right');
        $('p#actionTitle').html('<span class="fa fa-arrow-left"> </span><b> Drop in a folder</b>');
      },
    }];
  },
}).register('foldersWidget');

Blaze.registerHelper('FoldersWidget', () => FoldersWidget);





