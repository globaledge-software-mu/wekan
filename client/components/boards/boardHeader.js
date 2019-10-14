Template.boardMenuPopup.events({
  'click .js-rename-board': Popup.open('boardChangeTitle'),
  'click .js-custom-fields'() {
    Sidebar.setView('customFields');
    Popup.close();
  },
  'click .js-open-archives'() {
    Sidebar.setView('archives');
    Popup.close();
  },
  'click .js-change-board-color': Popup.open('boardChangeColor'),
  'click .js-change-language': Popup.open('changeLanguage'),
  'click .js-archive-board ': Popup.afterConfirm('archiveBoard', function() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    currentBoard.archive();
    // XXX We should have some kind of notification on top of the page to
    // confirm that the board was successfully archived.
    FlowRouter.go('home');
  }),
  'click .js-delete-board': Popup.afterConfirm('deleteBoard', function() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    Popup.close();
    Boards.remove(currentBoard._id);
    FlowRouter.go('home');
  }),
  'click .js-outgoing-webhooks': Popup.open('outgoingWebhooks'),
  'click .js-clone-board': Popup.open('cloneBoard'),
  'click .js-import-board': Popup.open('chooseBoardSource'),
  'click .js-subtask-settings': Popup.open('boardSubtaskSettings'),
});

Template.boardMenuPopup.helpers({
  exportUrl() {
    const params = {
      boardId: Session.get('currentBoard'),
    };
    const queryParams = {
      authToken: Accounts._storedLoginToken(),
    };
    return FlowRouter.path('/api/boards/:boardId/export', params, queryParams);
  },
  exportFilename() {
    const boardId = Session.get('currentBoard');
    return `wekan-export-board-${boardId}.json`;
  },
});

Template.boardChangeTitlePopup.events({
  submit(evt, tpl) {
    const newTitle = tpl.$('.js-board-name').val().trim();
    const newDesc = tpl.$('.js-board-desc').val().trim();
    if (newTitle) {
      this.rename(newTitle);
      this.setDescription(newDesc);
      Popup.close();
    }
    evt.preventDefault();
  },
});

BlazeComponent.extendComponent({
  watchLevel() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return currentBoard && currentBoard.getWatchLevel(Meteor.userId());
  },

  isStarred() {
    const boardId = Session.get('currentBoard');
    const user = Meteor.user();
    return user && user.hasStarred(boardId);
  },

  // Only show the star counter if the number of star is greater than 2
  showStarCounter() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return currentBoard && currentBoard.stars >= 2;
  },

  events() {
    return [{
      'click .js-edit-board-title': Popup.open('boardChangeTitle'),
      'click .js-star-board'() {
        Meteor.user().toggleBoardStar(Session.get('currentBoard'));
      },
      'click .js-open-board-menu': Popup.open('boardMenu'),
      'click .js-change-visibility': Popup.open('boardChangeVisibility'),
      'click .js-watch-board': Popup.open('boardChangeWatch'),
      'click .js-open-archived-board'() {
        Modal.open('archivedBoards');
      },
      'click .js-toggle-board-view'() {
        const currentUser = Meteor.user();
        if ((currentUser.profile || {}).boardView === 'board-view-swimlanes') {
          currentUser.setBoardView('board-view-cal');
        } else if ((currentUser.profile || {}).boardView === 'board-view-lists') {
          currentUser.setBoardView('board-view-swimlanes');
        } else if ((currentUser.profile || {}).boardView === 'board-view-cal') {
          currentUser.setBoardView('board-view-lists');
        } else {
          currentUser.setBoardView('board-view-swimlanes');
        }
      },
      'click .js-toggle-sidebar'() {
        Sidebar.toggle();
      },
      'click .js-open-filter-view'() {
        Sidebar.setView('filter');
      },
      'click .js-filter-reset'(evt) {
        evt.stopPropagation();
        Sidebar.setView();
        Filter.reset();
      },
      'click .js-open-search-view'() {
        Sidebar.setView('search');
      },
      'click .js-open-rules-view'() {
        Modal.openWide('rulesMain');
      },
      'click .js-multiselection-activate'() {
        const currentCard = Session.get('currentCard');
        MultiSelection.activate();
        if (currentCard) {
          MultiSelection.add(currentCard);
        }
      },
      'click .js-multiselection-reset'(evt) {
        evt.stopPropagation();
        MultiSelection.disable();
      },
      'click .js-log-in'() {
        FlowRouter.go('atSignIn');
      },
    }];
  },
}).register('boardHeaderBar');

Template.boardHeaderBar.helpers({
  canModifyBoard() {
    return Meteor.user() && Meteor.user().isBoardMember() && !Meteor.user().isCommentOnly();
  },
});

const CreateBoard = BlazeComponent.extendComponent({
  template() {
    return 'createBoard';
  },

  onCreated() {
    this.visibilityMenuIsOpen = new ReactiveVar(false);
    this.visibility = new ReactiveVar('private');
    this.boardId = new ReactiveVar('');
  },

  visibilityCheck() {
    return this.currentData() === this.visibility.get();
  },

  setVisibility(visibility) {
    this.visibility.set(visibility);
    this.visibilityMenuIsOpen.set(false);
  },

  toggleVisibilityMenu() {
    this.visibilityMenuIsOpen.set(!this.visibilityMenuIsOpen.get());
  },

  createTemplateBtn() {
    var status = $('.board-list').children('.js-add-board-template:visible').length;
    if (status < 1) {
      return false;
    }
    if ($('.js-create-board.js-add-board').hasClass('is-active')) {
      return false;
    }
    return true;
  },

  onSubmit(evt) {
    evt.preventDefault();
    const title = this.find('.js-new-board-title').value;

    // If creating regular board
    if ($('.board-list').children('.js-add-board-template:visible').length === 0) {
      const visibility = this.visibility.get();
      this.boardId.set(Boards.insert({
        title,
        permission: visibility,
      }));

      Swimlanes.insert({
        title: 'Default',
        boardId: this.boardId.get(),
      });

      Utils.goBoardId(this.boardId.get());
    } 
    // else creating board template
    else {
      let linkedId = '';
      linkedId = Boards.insert({
        title,
        permission: 'private',
        type: 'template-board',
      });

      Swimlanes.insert({
        title: TAPi18n.__('default'),
        boardId: linkedId,
      });

      const userProfile = Meteor.user().profile;
      const defaultBoardTemplatesList = Lists.findOne({
        swimlaneId: userProfile.boardTemplatesSwimlaneId,
        archived : false,
      });
      const _id = Cards.insert({
        title,
        listId: defaultBoardTemplatesList._id,   
        boardId: userProfile.templatesBoardId,
        sort: -1,
        swimlaneId: userProfile.boardTemplatesSwimlaneId,
        type: 'cardType-linkedBoard',
        linkedId,
      });

      Utils.goBoardId(linkedId);
    }
  },

  events() {
    return [{
      'click .js-select-visibility'() {
        this.setVisibility(this.currentData());
      },
      'click .js-change-visibility': this.toggleVisibilityMenu,
      'click .js-import': Popup.open('boardImportBoard'),
      submit: this.onSubmit,
      'click .js-import-board': Popup.open('chooseBoardSource'),
      'click .js-board-template': Popup.open('searchElement'),
    }];
  },
}).register('createBoardPopup');

(class HeaderBarCreateBoard extends CreateBoard {
  onSubmit(evt) {
    super.onSubmit(evt);
    // Immediately star boards crated with the headerbar popup.
    if ($('.board-list').children('.js-add-board-template:visible').length < 1) {
      Meteor.user().toggleBoardStar(this.boardId.get());
    }
  }
}).register('headerBarCreateBoardPopup');

BlazeComponent.extendComponent({
  visibilityCheck() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return this.currentData() === currentBoard.permission;
  },

  selectBoardVisibility() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    const visibility = this.currentData();
    currentBoard.setVisibility(visibility);
    Popup.close();
  },

  events() {
    return [{
      'click .js-select-visibility': this.selectBoardVisibility,
    }];
  },
}).register('boardChangeVisibilityPopup');

BlazeComponent.extendComponent({
  template() {
    return 'cloneBoardPopup';
  },
    
  onSubmit(evt) {
    evt.preventDefault();
    const title = this.find('.js-new-board-title').value;

    Meteor.call('cloneBoard', Session.get('currentBoard'), null, {title: title}, (err, res) => {
      Popup.close();
      if (err) {
        this.setError(err.error);
      } else {
        Session.set('currentBoard', null);
        Utils.goBoardId(res);
      }
    });
  },
  events() {
    return [{
      submit: this.onSubmit
    }];
  },
}).register('cloneBoardPopup');

BlazeComponent.extendComponent({
  watchLevel() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return currentBoard.getWatchLevel(Meteor.userId());
  },

  watchCheck() {
    return this.currentData() === this.watchLevel();
  },

  events() {
    return [{
      'click .js-select-watch'() {
        const level = this.currentData();
        Meteor.call('watch', 'board', Session.get('currentBoard'), level, (err, ret) => {
          if (!err && ret) Popup.close();
        });
      },
    }];
  },
}).register('boardChangeWatchPopup');
