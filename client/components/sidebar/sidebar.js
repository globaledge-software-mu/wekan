Sidebar = null;

const defaultView = 'home';

const viewTitles = {
  filter: 'filter-cards',
  search: 'search-cards',
  multiselection: 'multi-selection',
  customFields: 'custom-fields',
  archives: 'archives',
};

BlazeComponent.extendComponent({
  mixins() {
    return [Mixins.PerfectScrollbar];
  },

  onCreated() {
    this._isOpen = new ReactiveVar(false);
    this._view = new ReactiveVar(defaultView);
    Sidebar = this;
    Meteor.subscribe('remainders');
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
    if (typeof this.find('.js-board-sidebar-content') !== 'undefined') {
      const altitude = this.find('.js-board-sidebar-content').scrollHeight;
      this.callFirstWith(this, 'setNextPeak', altitude);
    }
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
    return `${this.getView()}Sidebar`;
  },

  getViewTitle() {
    return TAPi18n.__(viewTitles[this.getView()]);
  },

  showTongueTitle() {
    if (this.isOpen())
      return `${TAPi18n.__('sidebar-close')}`;
    else
      return `${TAPi18n.__('sidebar-open')}`;
  },

  events() {
    return [{
      'click .js-hide-sidebar': this.hide,
      'click .js-toggle-sidebar': this.toggle,
      'click .js-back-home': this.setView,
      'click .js-shortcuts'() {
        FlowRouter.go('shortcuts');
      },
    }];
  },
}).register('sidebar');

Blaze.registerHelper('Sidebar', () => Sidebar);

EscapeActions.register('sidebarView',
  () => { Sidebar.setView(defaultView); },
  () => { return Sidebar && Sidebar.getView() !== defaultView; }
);

Template.memberPopup.helpers({
  user() {
    return Users.findOne(this.userId);
  },
  memberType() {
    const type = Users.findOne(this.userId).isBoardAdmin() ? 'admin' : 'normal';
    if(type === 'normal'){
      const currentBoard = Boards.findOne(Session.get('currentBoard'));
      const commentOnly = currentBoard.hasCommentOnly(this.userId);
      const noComments = currentBoard.hasNoComments(this.userId);
      if(commentOnly){
        return TAPi18n.__('comment-only').toLowerCase();
      } else if(noComments) {
        return TAPi18n.__('no-comments').toLowerCase();
      } else {
        return TAPi18n.__(type).toLowerCase();
      }
    } else {
      return TAPi18n.__(type).toLowerCase();
    }
  },
  isInvited() {
    return Users.findOne(this.userId).isInvitedTo(Session.get('currentBoard'));
  },
  memberIsBoardAdmin() {
    const board = Boards.findOne({
      _id: Session.get('currentBoard'),
      members: {
        $elemMatch: {
          userId: this.userId,
          isAdmin: true
        }
      },
    });

    return board;
  },
});

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
  'click .js-exportas-template': Popup.open('exportTemplate') ,
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

Template.memberPopup.events({
  'click .js-filter-member'() {
    Filter.members.toggle(this.userId);
    Popup.close();
  },
  'click .js-change-role': Popup.open('changePermissions'),
  'click .js-remove-member': Popup.afterConfirm('removeMember', function() {
    const boardId = Session.get('currentBoard');
    const memberId = this.userId;
    Cards.find({ boardId, members: memberId }).forEach((card) => {
      card.unassignMember(memberId);
    });
    Boards.findOne(boardId).removeMember(memberId);
    Users.findOne(memberId).removeInvite(boardId);
    
    const remainder = Remainders.findOne({invitee:memberId});
    if (remainder && remainder._id) {
       Remainders.remove(remainder._id);
    }
    
    Popup.close();
  }),
  'click .js-leave-member': Popup.afterConfirm('leaveBoard', () => {
    const boardId = Session.get('currentBoard');
    Meteor.call('quitBoard', boardId, () => {
      Popup.close();
      FlowRouter.go('home');
    });
  }),
  
  'click .js-reinvite'() {
	  const user = Users.findOne({_id:this.userId});
	  Meteor.call('resendInviteToUser', user , (err, res) => {
	  	console.log(err);
		  if (err) {
			 $('.danger').removeClass('hide');
		  } else if(res.email) {
			 $('.warning').removeClass('hide');
		  }
	  });
   },
   
  'click .js-viewemail'() {
  	 Popup.close('member');
     Modal.open('viewEmail');
     Session.set('manageUserId', this.userId);
     Session.set('boardId', Session.get('currentBoard'));
   }
});

Template.removeMemberPopup.helpers({
  user() {
    return Users.findOne(this.userId);
  },
  board() {
    return Boards.findOne(Session.get('currentBoard'));
  },
  
});

Template.leaveBoardPopup.helpers({
  board() {
    return Boards.findOne(Session.get('currentBoard'));
  },
});

Template.membersWidget.helpers({
  isInvited() {
    const user = Meteor.user();
    return user && user.isInvitedTo(Session.get('currentBoard'));
  },
});

Template.membersWidget.events({
  'click .js-member': Popup.open('member'),
  'click .js-open-board-menu': Popup.open('boardMenu'),
  'click .js-manage-board-members': Popup.open('addMember'),
  'click .js-import': Popup.open('boardImportBoard'),
  submit: this.onSubmit,
  'click .js-import-board': Popup.open('chooseBoardSource'),
  'click .js-open-archived-board'() {
    Modal.open('archivedBoards');
  },
  'click .sandstorm-powerbox-request-identity'() {
    window.sandstormRequestIdentity();
  },
  'click .js-member-invite-accept'() {
    const boardId = Session.get('currentBoard');
    Meteor.user().removeInvite(boardId);
  },
  'click .js-member-invite-decline'() {
    const boardId = Session.get('currentBoard');
    Meteor.call('quitBoard', boardId, (err, ret) => {
      if (!err && ret) {
        Meteor.user().removeInvite(boardId);
        FlowRouter.go('home');
      }
    });
  },
});

BlazeComponent.extendComponent({
  integrations() {
    const boardId = Session.get('currentBoard');
    return Integrations.find({ boardId: `${boardId}` }).fetch();
  },

  integration(id) {
    const boardId = Session.get('currentBoard');
    return Integrations.findOne({ _id: id, boardId: `${boardId}` });
  },

  events() {
    return [{
      'submit'(evt) {
        evt.preventDefault();
        const url = evt.target.url.value;
        const boardId = Session.get('currentBoard');
        let id = null;
        let integration = null;
        if (evt.target.id) {
          id = evt.target.id.value;
          integration = this.integration(id);
          if (url) {
            Integrations.update(integration._id, {
              $set: {
                url: `${url}`,
              },
            });
          } else {
            Integrations.remove(integration._id);
          }
        } else if (url) {
          Integrations.insert({
            userId: Meteor.userId(),
            enabled: true,
            type: 'outgoing-webhooks',
            url: `${url}`,
            boardId: `${boardId}`,
            activities: ['all'],
          });
        }
        Popup.close();
      },
    }];
  },
}).register('outgoingWebhooksPopup');

BlazeComponent.extendComponent({
  template() {
    return 'chooseBoardSource';
  },
}).register('chooseBoardSourcePopup');

Template.labelsWidget.events({
  'click .js-label': Popup.open('editLabel'),
  'click .js-add-label': Popup.open('createLabel'),
});

// Board members can assign people or labels by drag-dropping elements from the
// sidebar to the cards on the board. In order to re-initialize the jquery-ui
// plugin any time a draggable member or label is modified or removed we use a
// autorun function and register a dependency on the both members and labels
// fields of the current board document.
function draggableMembersLabelsWidgets() {
  this.autorun(() => {
    const currentBoardId = Tracker.nonreactive(() => {
      return Session.get('currentBoard');
    });
    Boards.findOne(currentBoardId, {
      fields: {
        members: 1,
        labels: 1,
      },
    });
    Tracker.afterFlush(() => {
      const $draggables = this.$('.js-member,.js-label');
      $draggables.draggable({
        appendTo: 'body',
        helper: 'clone',
        revert: 'invalid',
        revertDuration: 150,
        snap: false,
        snapMode: 'both',
        start() {
          EscapeActions.executeUpTo('popup-back');
        },
      });

      function userIsMember() {
        return Meteor.user() && Meteor.user().isBoardMember();
      }

      this.autorun(() => {
        $draggables.draggable('option', 'disabled', !userIsMember());
      });
    });
  });
}

Template.membersWidget.onRendered(draggableMembersLabelsWidgets);
Template.labelsWidget.onRendered(draggableMembersLabelsWidgets);

BlazeComponent.extendComponent({
  backgroundColors() {
    return Boards.simpleSchema()._schema.color.allowedValues;
  },

  isSelected() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return currentBoard.color === this.currentData().toString();
  },

  events() {
    return [{
      'click .js-select-background'(evt) {
        const currentBoard = Boards.findOne(Session.get('currentBoard'));
        const newColor = this.currentData().toString();
        currentBoard.setColor(newColor);
        evt.preventDefault();
      },
    }];
  },
}).register('boardChangeColorPopup');

BlazeComponent.extendComponent({
  onCreated() {
    this.currentBoard = Boards.findOne(Session.get('currentBoard'));
  },

  allowsSubtasks() {
    return this.currentBoard.allowsSubtasks;
  },

  isBoardSelected() {
    return this.currentBoard.subtasksDefaultBoardId === this.currentData()._id;
  },

  isNullBoardSelected() {
    return (this.currentBoard.subtasksDefaultBoardId === null) || (this.currentBoard.subtasksDefaultBoardId === undefined);
  },

  boards() {
    return Boards.find({
      archived: false,
      'members.userId': Meteor.userId(),
    }, {
      sort: ['title'],
    });
  },

  lists() {
    return Lists.find({
      boardId: this.currentBoard._id,
      archived: false,
    }, {
      sort: ['title'],
    });
  },

  hasLists() {
    return this.lists().count() > 0;
  },

  isListSelected() {
    return this.currentBoard.subtasksDefaultBoardId === this.currentData()._id;
  },

  presentParentTask() {
    let result = this.currentBoard.presentParentTask;
    if ((result === null) || (result === undefined)) {
      result = 'no-parent';
    }
    return result;
  },

  events() {
    return [{
      'click .js-field-has-subtasks'(evt) {
        evt.preventDefault();
        this.currentBoard.allowsSubtasks = !this.currentBoard.allowsSubtasks;
        this.currentBoard.setAllowsSubtasks(this.currentBoard.allowsSubtasks);
        $('.js-field-has-subtasks .materialCheckBox').toggleClass('is-checked', this.currentBoard.allowsSubtasks);
        $('.js-field-has-subtasks').toggleClass('is-checked', this.currentBoard.allowsSubtasks);
        $('.js-field-deposit-board').prop('disabled', !this.currentBoard.allowsSubtasks);
      },
      'change .js-field-deposit-board'(evt) {
        let value = evt.target.value;
        if (value === 'null') {
          value = null;
        }
        this.currentBoard.setSubtasksDefaultBoardId(value);
        evt.preventDefault();
      },
      'change .js-field-deposit-list'(evt) {
        this.currentBoard.setSubtasksDefaultListId(evt.target.value);
        evt.preventDefault();
      },
      'click .js-field-show-parent-in-minicard'(evt) {
        const value = evt.target.id || $(evt.target).parent()[0].id ||  $(evt.target).parent()[0].parent()[0].id;
        const options = [
          'prefix-with-full-path',
          'prefix-with-parent',
          'subtext-with-full-path',
          'subtext-with-parent',
          'no-parent'];
        options.forEach(function(element) {
          if (element !== value) {
            $(`#${element} .materialCheckBox`).toggleClass('is-checked', false);
            $(`#${element}`).toggleClass('is-checked', false);
          }
        });
        $(`#${value} .materialCheckBox`).toggleClass('is-checked', true);
        $(`#${value}`).toggleClass('is-checked', true);
        this.currentBoard.setPresentParentTask(value);
        evt.preventDefault();
      },
    }];
  },
}).register('boardSubtaskSettingsPopup');

BlazeComponent.extendComponent({
  onCreated() {
    this.error = new ReactiveVar('');
    this.loading = new ReactiveVar(false);
    this.loadingAfterSelectedRole = new ReactiveVar(false);
    this.subscribe('roles');
  },

  onRendered() {
    this.find('.js-search-member input').focus();
    this.setLoading(false);
    this.setLoadingAfterSelectedRole(false);
  },

  isBoardMember() {
    const userId = this.currentData()._id;
    const user = Users.findOne(userId);
    return user && user.isBoardMember();
  },

  isValidEmail(email) {
    return SimpleSchema.RegEx.Email.test(email);
  },

  setError(error) {
    this.error.set(error);
  },

  setLoading(w) {
    this.loading.set(w);
  },

  isLoading() {
    return this.loading.get();
  },

  setLoadingAfterSelectedRole(w) {
    this.loadingAfterSelectedRole.set(w);
  },

  isLoadingAfterSelectedRole() {
    return this.loadingAfterSelectedRole.get();
  },

  inviteUser(idNameEmail, roleId, selectedUserGroupId) {
    const boardId = Session.get('currentBoard');
    if ($('.inviteFromBoardSidebar').length > 0 && $('.js-profile-role').length > 0) {
      this.setLoadingAfterSelectedRole(true);
    } else {
      this.setLoading(true);
    }
    const self = this;
    Meteor.call('inviteUserToBoard', idNameEmail, boardId, roleId, selectedUserGroupId, (err, ret) => {
      if ($('.inviteFromBoardSidebar').length > 0 && $('.js-profile-role').length > 0) {
        this.setLoadingAfterSelectedRole(false);
      } else {
        this.setLoading(false);
      }
      if (err) {
      	self.setError(err.message);
      	return false;
      } else if (ret.email) {
      	self.setError('email-sent');
      }
    });
  },

  events() {
    return [{
      'keyup input'() {
        this.setError('');
      },
      'click .js-select-member'() {
        const userId = this.currentData()._id;
        const currentBoard = Boards.findOne(Session.get('currentBoard'));
        if (!currentBoard.hasMember(userId)) {
          this.inviteUser(userId, '', '');
        }
      },
      'click .js-email-invite'() {
        $('.invite-not-sent').hide();

        const roleId = this.find('.js-profile-role').value;
        var leftBlank = ['undefined', null, ''];
        var roleNotSelected = leftBlank.indexOf(roleId) > -1;
        if (roleNotSelected) {
        	this.$('.role-not-selected').show();
        }

        const email = this.find('.js-search-member input').value.trim().toLowerCase();
        const posAt = email.indexOf('@');
        var validEmailNotEntered = posAt < 1;
        if (validEmailNotEntered) {
        	this.$('.valid-email-not-entered').show();
        }

        let duplicateUserEmail = null;
        if (posAt >= 0) {
          duplicateUserEmail = Users.findOne({emails: {$elemMatch: {address: email}}});
        }
        const emailMessageElement = this.$('.email-taken');
        if (duplicateUserEmail) {
          emailMessageElement.show();
        }

        if (roleNotSelected || validEmailNotEntered || duplicateUserEmail) {
        	return false;
        }

        const idNameEmail = $('.js-search-member input').val();
        if (idNameEmail.indexOf('@')<0 || this.isValidEmail(idNameEmail)) {
          var selectedUserGroupId = '';
          if (this.find('.choose-specific-quota-to-use option:selected')) {
            selectedUserGroupId = this.find('.choose-specific-quota-to-use option:selected').value;
          }
	    		this.inviteUser(idNameEmail, roleId, selectedUserGroupId);
        } else {
        	this.setError('email-invalid');
      	}
      },
    }];
  },
}).register('addMemberPopup');

Template.changePermissionsPopup.events({
  'click .js-set-admin, click .js-set-normal, click .js-set-no-comments, click .js-set-comment-only'(event) {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    const memberId = this.userId;
    const isAdmin = $(event.currentTarget).hasClass('js-set-admin');
    const isCommentOnly = $(event.currentTarget).hasClass('js-set-comment-only');
    const isNoComments = $(event.currentTarget).hasClass('js-set-no-comments');
    currentBoard.setMemberPermission(memberId, isAdmin, isNoComments, isCommentOnly);
    Popup.back(1);
  },
});

Template.changePermissionsPopup.helpers({
  isAdmin() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return currentBoard.hasAdmin(this.userId);
  },

  isNormal() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return !currentBoard.hasAdmin(this.userId) && !currentBoard.hasNoComments(this.userId) && !currentBoard.hasCommentOnly(this.userId);
  },

  isNoComments() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return !currentBoard.hasAdmin(this.userId) && currentBoard.hasNoComments(this.userId);
  },

  isCommentOnly() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return !currentBoard.hasAdmin(this.userId) && currentBoard.hasCommentOnly(this.userId);
  },

  isLastAdmin() {
    const currentBoard = Boards.findOne(Session.get('currentBoard'));
    return currentBoard.hasAdmin(this.userId) && (currentBoard.activeAdmins() === 1);
  },
});

BlazeComponent.extendComponent({
  events() {
  	return [{
  	  'click .js-template-name-save':function() {
  	  	$('.enter-valid-email').hide();
  	  	const boardId = Session.get('currentBoard');
  	    const board = Boards.findOne({_id: boardId});
  	    const templateName = $('input[name=template-name]').val();
  	    if (templateName == '') {
  	    	$('.enter-valid-email').show();
  	    	return false;
  	    } else{
  	    	$('.sk-spinner-wave').removeClass('hide');
  	    	Meteor.call('cloneBoard', board._id, Session.get('currentBoard'),{type:'template-board', title: templateName},
  	  	      (err, res)  =>  {
  	  	    	  if (err) {
  	              this.setError(err.error);
  	              $('.sk-spinner-wave').addClass('hide');
  	         	    $('#form-container').removeClass('hide');
  	             } else {
  	               Session.set('fromBoard', null);
  	               Utils.goBoardId(res);
  	              }
  	  	    	  }
  	  	      );
  	    }
  	    /**/
  	   }
   }]
 }
}).register('exportTemplatePopup')