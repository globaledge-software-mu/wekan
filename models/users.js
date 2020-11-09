// Sandstorm context is detected using the METEOR_SETTINGS environment variable
// in the package definition.
const isSandstorm = Meteor.settings && Meteor.settings.public &&
  Meteor.settings.public.sandstorm;
Users = Meteor.users;

/**
 * A User in wekan
 */
Users.attachSchema(new SimpleSchema({
  username: {
    /**
     * the username of the user
     */
    type: String,
    optional: true,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        const name = this.field('profile.fullname');
        if (name.isSet) {
          return name.value.toLowerCase().replace(/\s/g, '');
        }
      }
    },
  },
  emails: {
    /**
     * the list of emails attached to a user
     */
    type: [Object],
    optional: true,
  },
  'emails.$.address': {
    /**
     * The email address
     */
    type: String,
    regEx: SimpleSchema.RegEx.Email,
  },
  'emails.$.verified': {
    /**
     * Has the email been verified
     */
    type: Boolean,
  },
  createdAt: {
    /**
     * creation date of the user
     */
    type: Date,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert) {
        return new Date();
      } else {
        this.unset();
      }
    },
  },
  profile: {
    /**
     * profile settings
     */
    type: Object,
    optional: true,
    autoValue() { // eslint-disable-line consistent-return
      if (this.isInsert && !this.isSet) {
        return {
          boardView: 'board-view-lists',
        };
      }
    },
  },
  'profile.avatarUrl': {
    /**
     * URL of the avatar of the user
     */
    type: String,
    optional: true,
  },
  'profile.emailBuffer': {
    /**
     * list of email buffers of the user
     */
    type: [String],
    optional: true,
  },
  'profile.fullname': {
    /**
     * full name of the user
     */
    type: String,
    optional: true,
  },
  'profile.hiddenSystemMessages': {
    /**
     * does the user wants to hide system messages?
     */
    type: Boolean,
    optional: true,
  },
  'profile.initials': {
    /**
     * initials of the user
     */
    type: String,
    optional: true,
  },
  'profile.invitedBoards': {
    /**
     * board IDs the user has been invited to
     */
    type: [String],
    optional: true,
  },
  'profile.language': {
    /**
     * language of the user
     */
    type: String,
    optional: true,
  },
  'profile.notifications': {
    /**
     * enabled notifications for the user
     */
    type: [String],
    optional: true,
  },
  'profile.showCardsCountAt': {
    /**
     * showCardCountAt field of the user
     */
    type: Number,
    optional: true,
  },
  'profile.starredBoards': {
    /**
     * list of starred board IDs
     */
    type: [String],
    optional: true,
  },
  'profile.icode': {
    /**
     * icode
     */
    type: String,
    optional: true,
  },
  'profile.boardView': {
    /**
     * boardView field of the user
     */
    type: String,
    optional: true,
    allowedValues: [
      'board-view-lists',
      'board-view-swimlanes',
      'board-view-cal',
    ],
  },
  'profile.templatesBoardId': {
    /**
     * Reference to the templates board
     */
    type: String,
    defaultValue: '',
  },
  'profile.cardTemplatesSwimlaneId': {
    /**
     * Reference to the card templates swimlane Id
     */
    type: String,
    defaultValue: '',
  },
  'profile.listTemplatesSwimlaneId': {
    /**
     * Reference to the list templates swimlane Id
     */
    type: String,
    defaultValue: '',
  },
  'profile.boardTemplatesSwimlaneId': {
    /**
     * Reference to the board templates swimlane Id
     */
    type: String,
    defaultValue: '',
  },
  services: {
    /**
     * services field of the user
     */
    type: Object,
    optional: true,
    blackbox: true,
  },
  heartbeat: {
    /**
     * last time the user has been seen
     */
    type: Date,
    optional: true,
  },
  isAdmin: {
    /**
     * is the user an admin of the board?
     */
    type: Boolean,
    optional: true,
  },
  roleId: {
    type: String,
    optional: true,
  },
  roleName: {
    type: String,
    optional: true,
  },
  createdThroughApi: {
    /**
     * was the user created through the API?
     */
    type: Boolean,
    optional: true,
  },
  loginDisabled: {
    /**
     * loginDisabled field of the user
     */
    type: Boolean,
    optional: true,
  },
  'authenticationMethod': {
    /**
     * authentication method of the user
     */
    type: String,
    optional: false,
    defaultValue: 'password',
  },
  quotaGroupId: {
	  type: String,
	  optional: true,
  },
	createdBy: {
	  type: String,
	  optional: true,
    autoValue() {
      if (this.isInsert) {
        return Meteor.user()._id;
      } else {
        this.unset();
      }
    },
	},
}));

Users.allow({
  update() {
    return true;
  },
  remove(userId, doc) {
    const adminsNumber = Users.find({ isAdmin: true }).count();
    const { isAdmin } = Users.findOne({ _id: userId }, { fields: { 'isAdmin': 1 } });

    // Prevents remove of the only one administrator
    if (adminsNumber === 1 && isAdmin && userId === doc._id) {
      return false;
    }

    // If it's the user or an admin
    return userId === doc._id || isAdmin;
  },
  fetch: [],
});

// Search a user in the complete server database by its name or username. This
// is used for instance to add a new user to a board.
const searchInFields = ['username', 'profile.fullname'];
Users.initEasySearch(searchInFields, {
  use: 'mongo-db',
  returnFields: [...searchInFields, 'profile.avatarUrl'],
});

if (Meteor.isClient) {
  Users.helpers({
    isBoardMember() {
      const board = Boards.findOne(Session.get('currentBoard'));
      return board && board.hasMember(this._id);
    },

    isBoardTemplate() {
      const board = Boards.findOne({
      	_id: Session.get('currentBoard'),
      	type: 'template-board'
      });
      if (board) {
      	return true;
      } else {
      	return false;
      }
    },

    getRoleColor(user_id) {
    	var handler1 = Meteor.subscribe('users');
    	var handler2 = Meteor.subscribe('role_colors');

    	if (handler1.ready() && handler2.ready()) {
        var boardUser = Users.findOne({_id: user_id});
        if (boardUser && boardUser.isAdmin && boardUser.isAdmin == true) {
        	var roleColor = RoleColors.findOne({ userType: {$exists: true, $eq: 'admin'} });
        	if (roleColor && roleColor.color) {
            return roleColor.color;
        	}
        	return 'darkkhaki';
        } else if (boardUser && boardUser.roleId) {
        	var roleColor = RoleColors.findOne({ roleId: {$exists: true, $eq: boardUser.roleId} });
        	if (roleColor && roleColor.color) {
            return roleColor.color;
        	}
        	return 'darkkhaki';
        }
        return 'darkkhaki';
    	}
    },

    isNotNoComments() {
      const board = Boards.findOne(Session.get('currentBoard'));
      return board && board.hasMember(this._id) && !board.hasNoComments(this._id);
    },

    isNoComments() {
      const board = Boards.findOne(Session.get('currentBoard'));
      return board && board.hasNoComments(this._id);
    },

    isNotCommentOnly() {
      const board = Boards.findOne(Session.get('currentBoard'));
      return board && board.hasMember(this._id) && !board.hasCommentOnly(this._id);
    },

    isCommentOnly() {
      const board = Boards.findOne(Session.get('currentBoard'));
      return board && board.hasCommentOnly(this._id);
    },

    hasMultipleUsableUserQuotaGroups() {
    	var handler1 = Meteor.subscribe('assigned_user_groups');
    	var handler2 = Meteor.subscribe('user_groups');
    	if (handler1.ready() && handler2.ready()) {
      	var usableUserQuotaGroups = 0;
        AssignedUserGroups.find({userId: this._id}).forEach((aUG) => {
        	const userGroup = UserGroups.findOne({_id: aUG.userGroupId});
        	if (userGroup && userGroup._id) {
        		const unusedQuota = userGroup.usersQuota - userGroup.usedUsersQuota;
        		if (unusedQuota > 0) {
        			usableUserQuotaGroups++;
        		}
        	}
        });
        if (usableUserQuotaGroups > 1) {
          return true;
        }
        return false;
    	}
      return false;
    },

    
    hasUsableUserQuotaGroups() {
        var handler1 = Meteor.subscribe('assigned_user_groups');
        var handler2 = Meteor.subscribe('user_groups');
        if (handler1.ready() && handler2.ready()) {
        	var usableUserQuotaGroups = false;
        	AssignedUserGroups.find({userId: this._id}).forEach((aUG) => {
            const userGroup = UserGroups.findOne({_id: aUG.userGroupId});
            if (userGroup && userGroup._id) {
                const unusedQuota = userGroup.usersQuota - userGroup.usedUsersQuota;
                if (unusedQuota > 0) {
                    usableUserQuotaGroups = true;
                }
        	}
        });
        }
      return usableUserQuotaGroups;
    },
    
    hasMultipleUsableBoardQuotaGroups() {
    	var handler1 = Meteor.subscribe('assigned_user_groups');
    	var handler2 = Meteor.subscribe('user_groups');
    	if (handler1.ready() && handler2.ready()) {
      	var usableBoardQuotaGroups = 0;
        AssignedUserGroups.find({userId: this._id}).forEach((aUG) => {
        	const userGroup = UserGroups.findOne({_id: aUG.userGroupId});
        	if (userGroup && userGroup._id) {
        		const unusedQuota = userGroup.boardsQuota - userGroup.usedBoardsQuota;
        		if (unusedQuota > 0) {
        			usableBoardQuotaGroups++;
        		}
        	}
        });
        if (usableBoardQuotaGroups > 1) {
          return true;
        }
        return false;
    	}
      return false;
    },
    usableUsersQuotaGroups() {
      const usableUsersQuotaUserGroupsIds = new Array();
      AssignedUserGroups.find({ userId: Meteor.userId() }).forEach((aUG) => {
      	const userGroup = UserGroups.findOne({_id: aUG.userGroupId});
      	if (userGroup && userGroup._id) {
      		var unusedUsersQuota = userGroup.usersQuota - userGroup.usedUsersQuota;
      		if (unusedUsersQuota > 0) {
      			usableUsersQuotaUserGroupsIds.push(userGroup._id);
      		}
      	}
      });
      return UserGroups.find({_id: {$in: usableUsersQuotaUserGroupsIds}});
    },

    usableBoardsQuotaGroups() {
      const usableBoardsQuotaUserGroupsIds = new Array();
      AssignedUserGroups.find({ userId: Meteor.userId() }).forEach((aUG) => {
      	const userGroup = UserGroups.findOne({_id: aUG.userGroupId});
      	if (userGroup && userGroup._id) {
      		var unusedBoardsQuota = userGroup.boardsQuota - userGroup.usedBoardsQuota;
      		if (unusedBoardsQuota > 0) {
      			usableBoardsQuotaUserGroupsIds.push(userGroup._id);
      		}
      	}
      });
      return UserGroups.find({_id: {$in: usableBoardsQuotaUserGroupsIds}});
    },

    hasTemplate() {
      var templateMember = Boards.find({
        type: 'template-board',
        'members.userId': Meteor.userId(),
        archived: false,
      });
      if (templateMember.count() > 0) {
        return true;
      } else {
        return false;
      }
    },

    hasTemplatesOrIsAdminOrManager() {
       if (this.hasTemplate() || this.isAdminOrManager()){
        return true;
       } else {
        return false;
       }
    },

    hasTemplatesAndIsAdminOrManager() {
      if (this.hasTemplate() && this.isAdminOrManager()){
       return true;
      } else {
       return false;
      }
    },

    isBoardAdmin() {
      const board = Boards.findOne(Session.get('currentBoard'));
      return board && board.hasAdmin(this._id);
    },

    isCoach() {
      var coachRole = Roles.findOne({name: 'Coach'});
      if (coachRole && coachRole._id) {
        var coach = Users.find({_id: this._id, roleId: coachRole._id});
        if (coach.count() == 1) {
        	return true;
        }
        return false;
      }
      return false;
    },

    isCoachee() {
      var coacheeRole = Roles.findOne({name: 'Coachee'});
      if (coacheeRole && coacheeRole._id) {
        var coachee = Users.find({_id: this._id, roleId: coacheeRole._id});
        if (coachee.count() == 1) {
        	return true;
        }
        return false;
      }
      return false;
    },

    isBoardMemberAndCoach() {
      const board = Boards.findOne(Session.get('currentBoard'));
      return board && board.hasMember(this._id) && this.isCoach();
    },

    // is Admin, Manager or Coach
    isAuthorised() {
      var isAllowed = false;
      var roles = Roles.find({
        $or: [
          { name: 'Manager' },
          { name: 'Coach' }
        ]
      }).fetch();
      const LoggedUserRoleId = Meteor.user().roleId;
      if (roles && roles.length) {
        for (var i = 0; i < roles.length; i++) {
          if (LoggedUserRoleId === roles[i]._id) {
            isAllowed = true;
          }
        }
      }
      if (Meteor.user().isAdmin || isAllowed) {
        return true;
      }
      return false;
    },

    isAdminOrManager() {
    	var allow = false;
      if ( Meteor.user().isAdmin ) {
      	allow = true;
		  }
      var manager = Roles.findOne({name: 'Manager'});
      if (manager && manager._id) {
      	var managerId = manager._id;
        if ( Meteor.user().isAdmin || (manager && Meteor.user().roleId == manager._id) ) {
        	allow = true;
  		  }
      }
      return allow;
    },

    isCoachOrCoachee() {
      var coachOrCoachee = Roles.find( { name: { $in: [ 'Coach', 'Coachee' ] } } ).fetch();
      if (coachOrCoachee &&
      		coachOrCoachee[0] &&
      		coachOrCoachee[0]._id &&
      		( coachOrCoachee[0]._id == this.roleId || coachOrCoachee[1]._id == this.roleId	)
  		) {
		    return true;
		  } else {
	      return false;
		  }
    },

    isManagerAndNotAdmin() {
      const manager = Roles.findOne({ name: 'Manager' });
      const managerAndNotAdmin = Users.findOne({ _id: Meteor.user()._id, roleId: manager._id, isAdmin: false });
      if (managerAndNotAdmin) {
        return true;
      }
      return false;
    },

    isCoachAndNotAdmin() {
      const coach = Roles.findOne({ name: 'Coach' });
      const coachAndNotAdmin = Users.find({
      	_id: Meteor.user()._id,
      	roleId: coach._id,
      	$or: [
      		{ isAdmin: { $exists: false } },
      		{ isAdmin: false }
  			]
    	});
      if (coachAndNotAdmin && coachAndNotAdmin.count() > 0) {
        return true;
      }
      return false;
    },

    regularBoard() {
    	return this.isBoardMember() && !this.isCommentOnly() && !this.isBoardTemplate();
    },

    isBoardTemplateAdmin() {
    	return this.isBoardTemplate() && this.isBoardAdmin();
    },

    canAlterCard() {
      if ( this.regularBoard() || this.isBoardTemplateAdmin() ) {
      	return true;
      } else {
      	return false;
      }
    },

    adminOrManagerCanAssignTemplate() {
      if ( this.isAdminOrManager() && this.isBoardTemplate() ) {
      	return true;
      } else {
      	return false;
      }
    },

    canAddList() {
    	if ( ( this.hasPermission('lists', 'insert') && this.regularBoard() ) || this.isBoardTemplateAdmin() ) {
        return true;
    	} else {
        return false;
    	}
    },

    canSeeAddCard() {
      if ( ( this.hasPermission('cards', 'insert') && this.regularBoard() ) || this.isBoardTemplateAdmin() ) {
      	return true;
      } else {
      	return false;
      }
    },

    canCustomiseFields() {
    	if ( ( this.hasPermission('customization', 'update') && this.regularBoard() ) || this.isBoardTemplateAdmin() ) {
        return true;
    	} else {
        return false;
    	}
    },

    hasPermission(group, access) {
      if (!this.roleId || this.isAdmin) {
        return true;
      }
      const role = Roles.findOne(this.roleId);
      if (!role) {
        return false;
      }
      return role.hasPermission(group, access);
    },

    hasBoardOrIsBoardMember() {
      var boardsCount = Boards.find({
      	'members.userId': this._id,
      	archived: false
      }).count();
      if (boardsCount > 0) {
      	return true;
      } else {
      	return false;
      }
    },

  	removeBoardFromFolder(boardIdentifier, targetFolder, targetFolderId) {
      var boardIds = new Array;
      var folderContents = targetFolder.contents;
  		if (folderContents) {
    		for (var t = 0; t < _.keys(folderContents).length; t++) {
        	if (folderContents[t].boardId !== boardIdentifier) {
    	      boardIds.push(folderContents[t].boardId);
    	    }
    		}
  		}

      Folders.update(
        { _id : targetFolderId },
        { $unset: { contents : '' } }
      );
      for (var z = 0; z < boardIds.length; z++) {
        var keyName = 'contents.' + z + '.boardId';
        Folders.update(
          { _id: targetFolderId },
          { $set: { [keyName] : boardIds[z] } }
        );
      }
    },

    changeBoardToRegular(boardIdentifier) {
      Boards.update(
        { _id: boardIdentifier },
        { $set: {
        		type : 'board'
        	},
        }
      );

      // removing the board template linked card and swimlane docs, since the
      // board that it represented has been changed to a regular one
      var linkedCard = Cards.findOne({
      	linkedId: boardIdentifier,
      	type: 'cardType-linkedBoard',
    	});
      if (linkedCard && linkedCard._id) {
        Cards.remove(linkedCard._id);
      }
    },

    addEveryAdminAndManagerToBoard(boardIdentifier) {
      // make every admin and manager of the system a member of the template
      var managerRole = Roles.findOne({name: 'Manager'});
      var managerRoleId = null;
      if (managerRole && managerRole._id) {
      	managerRoleId = managerRole._id;
      }
      var adminsOrManagers = Users.find({
      	$or: [
      		{ isAdmin: true },
      		{ roleId: managerRoleId }
    		]
      });
  		var boardTemplateMembers = (Boards.findOne({_id: boardIdentifier})).members;
    	adminsOrManagers.forEach((adminOrManager) => {
    		var adminOrManagerId = adminOrManager._id;
  			isMember = false;
    		boardTemplateMembers.forEach((boardTemplateMember) => {
      		if (boardTemplateMember.userId == adminOrManagerId) {
      			isMember = true;
      		}
        });
    		if (isMember === false) {
          Boards.update(
            { _id: boardIdentifier },
            { $push: {
	              members: {
	                userId: adminOrManagerId,
	                isAdmin: false,
	                isActive: true,
	                isCommentOnly: false,
	              },
	            },
            }
          );
    		}
      });
    },

  });
}

Users.helpers({
  boards() {
    return Boards.find({ 'members.userId': this._id });
  },

  starredBoards() {
    const {starredBoards = []} = this.profile || {};
    return Boards.find({archived: false, _id: {$in: starredBoards}});
  },

  hasStarred(boardId) {
    const {starredBoards = []} = this.profile || {};
    return _.contains(starredBoards, boardId);
  },

  invitedBoards() {
    const {invitedBoards = []} = this.profile || {};
    return Boards.find({archived: false, _id: {$in: invitedBoards}});
  },

  isInvitedTo(boardId) {
    const {invitedBoards = []} = this.profile || {};
    return _.contains(invitedBoards, boardId);
  },

  hasTag(tag) {
    const {tags = []} = this.profile || {};
    return _.contains(tags, tag);
  },

  hasNotification(activityId) {
    const {notifications = []} = this.profile || {};
    return _.contains(notifications, activityId);
  },

  hasHiddenSystemMessages() {
    const profile = this.profile || {};
    return profile.hiddenSystemMessages || false;
  },

  getEmailBuffer() {
    const {emailBuffer = []} = this.profile || {};
    return emailBuffer;
  },

  getInitials() {
    const profile = this.profile || {};
    if (profile.initials)
      return profile.initials;

    else if (profile.fullname) {
      return profile.fullname.split(/\s+/).reduce((memo, word) => {
        return memo + word[0];
      }, '').toUpperCase();

    } else {
      return this.username[0].toUpperCase();
    }
  },

  getLimitToShowCardsCount() {
    const profile = this.profile || {};
    return profile.showCardsCountAt;
  },

  getName() {
    const profile = this.profile || {};
    return profile.fullname || this.username;
  },

  getLanguage() {
    const profile = this.profile || {};
    return profile.language || 'nl';
  },

  getTemplatesBoardId() {
    return (this.profile || {}).templatesBoardId;
  },

  getTemplatesBoardSlug() {
    return (Boards.findOne((this.profile || {}).templatesBoardId) || {}).slug;
  },

  remove() {
    User.remove({ _id: this._id});
  },

});

Users.mutations({
  toggleBoardStar(boardId) {
    const queryKind = this.hasStarred(boardId) ? '$pull' : '$addToSet';
    return {
      [queryKind]: {
        'profile.starredBoards': boardId,
      },
    };
  },

  addInvite(boardId) {
    return {
      $addToSet: {
        'profile.invitedBoards': boardId,
      },
    };
  },

  removeInvite(boardId) {
    return {
      $pull: {
        'profile.invitedBoards': boardId,
      },
    };
  },

  addTag(tag) {
    return {
      $addToSet: {
        'profile.tags': tag,
      },
    };
  },

  removeTag(tag) {
    return {
      $pull: {
        'profile.tags': tag,
      },
    };
  },

  toggleTag(tag) {
    if (this.hasTag(tag))
      this.removeTag(tag);
    else
      this.addTag(tag);
  },

  toggleSystem(value = false) {
    return {
      $set: {
        'profile.hiddenSystemMessages': !value,
      },
    };
  },

  addNotification(activityId) {
    return {
      $addToSet: {
        'profile.notifications': activityId,
      },
    };
  },

  removeNotification(activityId) {
    return {
      $pull: {
        'profile.notifications': activityId,
      },
    };
  },

  addEmailBuffer(text) {
    return {
      $addToSet: {
        'profile.emailBuffer': text,
      },
    };
  },

  clearEmailBuffer() {
    return {
      $set: {
        'profile.emailBuffer': [],
      },
    };
  },

  setAvatarUrl(avatarUrl) {
    return {$set: {'profile.avatarUrl': avatarUrl}};
  },

  setShowCardsCountAt(limit) {
    return {$set: {'profile.showCardsCountAt': limit}};
  },

  setBoardView(view) {
    return {
      $set : {
        'profile.boardView': view,
      },
    };
  },
});

Meteor.methods({
  setUsername(username, userId) {
    check(username, String);
    check(userId, String);
    const nUsersWithUsername = Users.find({username}).count();
    if (nUsersWithUsername > 0) {
      throw new Meteor.Error('username-already-taken');
    } else {
      Users.update(userId, {$set: {username}});
    }
  },
  toggleSystemMessages() {
    const user = Meteor.user();
    user.toggleSystem(user.hasHiddenSystemMessages());
  },
  changeLimitToShowCardsCount(limit) {
    check(limit, Number);
    Meteor.user().setShowCardsCountAt(limit);
  },
  setEmail(email, userId) {
    check(email, String);
    check(userId, String);
    const existingUser = Users.findOne({'emails.address': email}, {fields: {_id: 1}});
    if (existingUser) {
      throw new Meteor.Error('email-already-taken');
    } else {
      Users.update(userId, {
        $set: {
          emails: [{
            address: email,
            verified: false,
          }],
        },
      });
    }
  },
  setUsernameAndEmail(username, email, userId) {
    check(username, String);
    check(email, String);
    check(userId, String);
    Meteor.call('setUsername', username, userId);
    Meteor.call('setEmail', email, userId);
  },
  setPassword(newPassword, userId) {
    check(userId, String);
    check(newPassword, String);
    if(Meteor.user().isAdmin){
      Accounts.setPassword(userId, newPassword);
    }
  },
});

if (Meteor.isServer) {
  Meteor.methods({

  	setLanguageNewUser(token, lang) {
      check(token, String);
      check(lang, String);

      var user = Users.findOne({"services.password.reset.token": token});
      if (user && user._id) {
        Users.update(
          { _id: user._id },
          { $set: {
            'profile.language': lang
          } }
        );
      }
  	},

  	setLanguageExistingUser(match, lang) {
      check(match, String);
      check(lang, String);

      var user = Users.findOne({
        $or: [
          {email: match},
          {username: match}
        ]
      });
      if (user && user._id) {
        Users.update(
          { _id: user._id },
          { $set: {
            'profile.language': lang
          } }
        );
      }
      return true;
  	},

  	getEnrollingUserEmail(token) {
      check(token, String);

      var user = Users.findOne({"services.password.reset.token": token});
      if (user && user._id) {
        return user.emails[0].address;
      }
  	},

  	mailNewSubscriptionSuccess(subscriberEmail, lang, params) {
      check(subscriberEmail, String);
      check(lang, String);
      check(params, Object);

	    try {
	      Email.send({
	        to: subscriberEmail,
	        from: Accounts.emailTemplates.from,
	        subject: TAPi18n.__('email-notify-subscriber-his-subscription-was-successful-subject', params, lang),
	        text: TAPi18n.__('email-notify-subscriber-his-subscription-was-successful-text', params, lang),
	      });
	      return {output: 'success'};
	    } catch (e) {
	      return {output: new Meteor.Error('email-fail', e.message)};
	    }
  	},

  	mailSubscriptionRenewalSuccess(subscriberEmail, lang, params) {
      check(subscriberEmail, String);
      check(lang, String);
      check(params, Object);

	    try {
	      Email.send({
	        to: subscriberEmail,
	        from: Accounts.emailTemplates.from,
	        subject: TAPi18n.__('email-notify-subscriber-his-subscription-is-renewed-subject', params, lang),
	        text: TAPi18n.__('email-notify-subscriber-his-subscription-is-renewed-text', params, lang),
	      });
	      return {output: 'success'};
	    } catch (e) {
	      return {output: new Meteor.Error('email-fail', e.message)};
	    }
  	},

  	mailSubscriptionUpgradeSuccess(subscriberEmail, lang, params) {
      check(subscriberEmail, String);
      check(lang, String);
      check(params, Object);

	    try {
	      Email.send({
	        to: subscriberEmail,
	        from: Accounts.emailTemplates.from,
	        subject: TAPi18n.__('email-notify-subscriber-his-subscription-is-upgraded-subject', params, lang),
	        text: TAPi18n.__('email-notify-subscriber-his-subscription-is-upgraded-text', params, lang),
	      });
	      return {output: 'success'};
	    } catch (e) {
	      return {output: new Meteor.Error('email-fail', e.message)};
	    }
  	},

  	createNewUser(params) {
      check(params, Object);

      const username = params.username;
      const email = params.email;

      // create new user
      const newUserId = Accounts.createUser({username, email});

      // update new user's details
    	Users.update(
  			{ _id: newUserId },
  			{ $set: {
          'profile.fullname': params.fullname,
          'isAdmin': params.isAdmin === 'true',
          'roleId': params.roleId,
          'roleName': params.roleName,
          'loginDisabled': false,
          'authenticationMethod': 'password',
  			} }
			);
      // Check if the user had selected any specific user group's quota to use or not!
  		const userGroup = UserGroups.findOne({_id: params.quotaGroupId});
  		if (userGroup && userGroup._id) {
  			var usedQuota = userGroup.usedUsersQuota  + 1;

  			// Update usedUsersQuota in UserGroups
  			UserGroups.update(
					{ _id: userGroup._id },
					{ $set: { usedUsersQuota: usedQuota } }
				);

  			// Update quotaGroupId in Users
  			Users.update(
					{ _id: newUserId },
					{ $set: { quotaGroupId: userGroup._id } }
				);
  		} else {
      	const userAssignedUserGroups = AssignedUserGroups.find({ userId: Meteor.user()._id }, {$sort: {groupOrder: 1}} ).fetch();
      	for (var i = 0; i < userAssignedUserGroups.length; i++) {
      		const userGroup = UserGroups.findOne({_id: userAssignedUserGroups[i].userGroupId});
      		if (userGroup && userGroup._id) {
        		var quotaDifference = userGroup.usersQuota - userGroup.usedUsersQuota;
        		if (quotaDifference > 0) {
        			var usedQuota = userGroup.usedUsersQuota  + 1;

        			// Update usedUsersQuota in UserGroups
        			UserGroups.update(
      					{ _id: userGroup._id },
      					{ $set: { usedUsersQuota: usedQuota } }
      				);

        			// Update quotaGroupId in Users
        			Users.update(
      					{ _id: newUserId },
      					{ $set: { quotaGroupId: userGroup._id } }
      				);

        			break;
        		}
      		}
      	};
      }

      // Send new user invite to complete registration by adding his password
      try {
        const user = Users.findOne({_id: newUserId});

        var token = Random.secret();
        var newDate = new Date();
        var tokenRecord = JSON.parse(JSON.stringify({
          token: token,
          email: email,
          when: newDate,
          reason: 'enroll'
        }));

        Users.update({ _id: newUserId }, {
          $set: {
            'services.password.reset': tokenRecord
          }
        });

        // before passing to template, update user object with new token
        Meteor._ensure(user, 'services', 'password').reset = tokenRecord;

        const enrollLink = Accounts.urls.enrollAccount(token);
        const logoUrl = Meteor.absoluteUrl() + 'rh-logo.png';

        const parameters = {
          user: user.username,
          enrollUrl: enrollLink,
          logoUrl: logoUrl
        };
        const lang = user.getLanguage();

        const message = '<!DOCTYPE html><html lang="en"><head> <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">' + TAPi18n.__('email-enroll-text', parameters, lang);

        Email.send({
          to: user.emails[0].address.toLowerCase(),
          from: Accounts.emailTemplates.from,
          subject: TAPi18n.__('email-enroll-subject', parameters, lang),
          html: message,
        });

        return newUserId;
      } catch (e) {
        throw new Meteor.Error('email-fail', e.message);
      }
  	},

    // we accept userId, username, email
    inviteUserToBoard(username, boardId, roleId, selectedUserGroupId) {
      check(username, String);
      check(boardId, String);
      check(roleId, String);
      check(selectedUserGroupId, String);

      const inviter = Meteor.user();
      const board = Boards.findOne(boardId);
      var allowInvite;
      if (board.type = 'template-board') {
	      allowInvite = inviter &&
	        board &&
	        board.members &&
	        _.contains(_.pluck(board.members, 'userId'), inviter._id) &&
	        _.where(board.members, {userId: inviter._id})[0].isActive;
      } else {
	      allowInvite = inviter &&
	        board &&
	        board.members &&
	        _.contains(_.pluck(board.members, 'userId'), inviter._id) &&
	        _.where(board.members, {userId: inviter._id})[0].isActive &&
	        _.where(board.members, {userId: inviter._id})[0].isAdmin;
      }
      if (!allowInvite) throw new Meteor.Error('error-board-notAMember');

      const posAt = username.indexOf('@');
      let user = null;
      if (posAt >= 0) {
        user = Users.findOne({emails: {$elemMatch: {address: username}}});
      } else {
        user = Users.findOne(username) || Users.findOne({username});
      }

      var continueExecution = true;
      var removedUnconfirmedUser = false;
      if (user) {
        continueExecution = false;

        if (user._id !== inviter._id) {
          board.addMember(user._id);
          user.addInvite(boardId);

          // If its a user that was already invited and has already set its own password,
          // we just send the invite to join the board
          if (user && user.services && user.services.password && user.services.password.bcrypt) {

            // Send Invite 'Login To Accept Invite To Board'
            try {
              const logoUrl = Meteor.absoluteUrl() + 'rh-logo.png';
              const params = {
                user: user.username,
                inviter: inviter.username,
                board: board.title,
                url: board.absoluteUrl(),
                logoUrl: logoUrl
              };
              const lang = user.getLanguage();
              Email.send({
                to: user.emails[0].address.toLowerCase(),
                from: Accounts.emailTemplates.from,
                subject: TAPi18n.__('email-invite-subject', params, lang),
                html: TAPi18n.__('email-invite-text', params, lang),
              });
            } catch (e) {
              throw new Meteor.Error('email-fail', e.message);
            }

          } else {
            Users.remove(user._id);
            removedUnconfirmedUser = true;
            continueExecution = true;
          }

        } else {
        	throw new Meteor.Error('error-user-notAllowSelf');
        }
      }

      if (continueExecution) {
        if (posAt <= 0) throw new Meteor.Error('error-user-doesNotExist');
        if (Settings.findOne().disableRegistration) throw new Meteor.Error('error-user-notCreated');
        // Set in lowercase email before creating account
        const email = username.toLowerCase();
        username = email.substring(0, posAt);
        // Create user doc
        const newUserId = Accounts.createUser({username, email});
        if (!newUserId) {
        	throw new Meteor.Error('error-user-notCreated');
        }

        // assume new user speak same language with inviter
        if (inviter.profile && inviter.profile.language) {
          Users.update(newUserId, {
            $set: {
              'profile.language': inviter.profile.language,
            },
          });
        }

        if (!removedUnconfirmedUser) {
          // Have the document UserGroup, which's field usersQuota was used for this addition, gets its field usedUsersQuota updated
          // And update the user's field quotaGroupId with the _id of the UserGroup which's quota was used.
          var updateUsingDefaultGroupOrder = false;
          // Check if the user had selected any specific user group's quota to use or not!
          var quotaGroupId = null;
          if (selectedUserGroupId.length > 0) {
            quotaGroupId = selectedUserGroupId;
            const userGroup = UserGroups.findOne({_id: quotaGroupId});
            if (userGroup && userGroup._id) {
              const usableQuota = userGroup.usersQuota - userGroup.usedUsersQuota;
              if (usableQuota > 0) {
                var usedQuota = userGroup.usedUsersQuota  + 1;
                // Update usedUsersQuota in UserGroups
                UserGroups.update(
                  { _id: userGroup._id },
                  { $set: { usedUsersQuota: usedQuota } }
                );

                // Update quotaGroupId in Users
                Users.update(
                  { _id: newUserId },
                  { $set: { quotaGroupId: userGroup._id } }
                );
              }
              // Have to add this else here as the settings tab of the admin panel also use this method to create users
              // and since multiple users can be created at once using that form, let's say the user selected a usergroup,
              // and let's say the selected usergroup has only 2 usable usersQuota and the user had input 4 e-mails to create 4 users
              // so then the system would create the first two users using the selected user group and the rest of the users shall be
              // created using the default system check for the order of the user's userGroups based on its usable usersQuota
              else {
                updateUsingDefaultGroupOrder = true;
              }
            }
          } else {
            updateUsingDefaultGroupOrder = true;
          }
          if (updateUsingDefaultGroupOrder) {
            const userAssignedUserGroups = AssignedUserGroups.find({ userId: inviter._id }, {$sort: {groupOrder: 1}} ).fetch();
            var hadUsableQuota = false;
            for (var i = 0; i < userAssignedUserGroups.length; i++) {
              const userGroup = UserGroups.findOne({_id: userAssignedUserGroups[i].userGroupId});
              if (userGroup && userGroup._id) {
                var quotaDifference = userGroup.usersQuota - userGroup.usedUsersQuota;
                if (quotaDifference > 0) {
                  var usedQuota = userGroup.usedUsersQuota  + 1;
                  // Update usedUsersQuota in UserGroups
                  UserGroups.update(
                    { _id: userGroup._id },
                    { $set: { usedUsersQuota: usedQuota } }
                  );

                  // Update quotaGroupId in Users
                  Users.update(
                    { _id: newUserId },
                    { $set: { quotaGroupId: userGroup._id } }
                  );

                  hadUsableQuota = true;
                  break;
                }
              }
            };

            if (!hadUsableQuota) {
              Users.remove(newUserId);
              throw new Meteor.Error('Email not sent as could not create user due to lack of quota');
            }
          }
        }

        // Send Enrollment Email
        user = Users.findOne({_id: newUserId});

        var token = Random.secret();
        var newDate = new Date();
        var tokenRecord = JSON.parse(JSON.stringify({
          token: token,
          email: email,
          when: newDate,
          reason: 'enroll'
        }));

        Users.update({ _id: newUserId }, {
          $set: {
            'services.password.reset': tokenRecord
          }
        });

        // before passing to template, update user object with new token
        Meteor._ensure(user, 'services', 'password').reset = tokenRecord;

        const enrollLink = Accounts.urls.enrollAccount(token);
        const logoUrl = Meteor.absoluteUrl() + 'rh-logo.png';

        const parameters = {
          user: user.username,
          enrollUrl: enrollLink,
          logoUrl: logoUrl
        };
        const lang = user.getLanguage();

        const message = '<!DOCTYPE html><html lang="en"><head> <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">' + TAPi18n.__('email-enroll-text', parameters, lang);

        Email.send({
          to: user.emails[0].address.toLowerCase(),
          from: Accounts.emailTemplates.from,
          subject: TAPi18n.__('email-enroll-subject', parameters, lang),
          html: message,
        });

        board.addMember(user._id);
        user.addInvite(boardId);

        // If roleId is not null, update the newly created user's role
        if (roleId) {
          const role = Roles.findOne({_id: roleId});
        	var roleName = null;
          if (user && role && role.name) {
          	roleName = role.name;
            Users.update(
          		{ _id: newUserId },
          		{ $set:
          			{ roleId: roleId, roleName: roleName }
          		}
        		);
          }
        }
      }

      return {userID: user._id, username: user.username, email: user.emails[0].address};
    },
    
    resendInviteToUser(userId) {
      check(userId, String);
      const user = Users.findOne({_id: userId});
      const inviter = Meteor.user();
      
      //
      if (user && user._id !== inviter._id) {
    	  //if user is invited to a board, resend  invite to board
    	  if (user.profile.invitedBoards && user.profile.invitedBoards.length > 0) {
    		  const boardId = user.profile.invitedBoards[0];
    		  const board = Boards.findOne({_id:boardId});
    	      var allowInvite;
    	      console.log(board);
    	      if (board.type = 'template-board') {
    		      allowInvite = inviter &&
    		        board &&
    		        board.members &&
    		        _.contains(_.pluck(board.members, 'userId'), inviter._id) &&
    		        _.where(board.members, {userId: inviter._id})[0].isActive;
    	      } else {
    		      allowInvite = inviter &&
    		        board &&
    		        board.members &&
    		        _.contains(_.pluck(board.members, 'userId'), inviter._id) &&
    		        _.where(board.members, {userId: inviter._id})[0].isActive &&
    		        _.where(board.members, {userId: inviter._id})[0].isAdmin;
    	      }
    	      if (!allowInvite) throw new Meteor.Error('error-board-notAMember');
              // Send Invite 'Login To Accept Invite To Board'
              try {
                const logoUrl = Meteor.absoluteUrl() + 'rh-logo.png';
                const params = {
                  user: user.username,
                  inviter: inviter.username,
                  board: board.title,
                  url: board.absoluteUrl(),
                  logoUrl: logoUrl
                };
                const lang = user.getLanguage();
                Email.send({
                  to: user.emails[0].address.toLowerCase(),
                  from: Accounts.emailTemplates.from,
                  subject: TAPi18n.__('email-invite-subject', params, lang),
                  html: TAPi18n.__('email-invite-text', params, lang),
                });
              } catch (e) {
                throw new Meteor.Error('email-fail', e.message);
              }
    	  } else {
    		  //or from a add user resend enrollment email
    		  var token = Random.secret();
    		  var newDate = new Date();
    	      var tokenRecord = JSON.parse(JSON.stringify({
    	    	  token: token,
    	          email: user.emails[0].address.toLowerCase(),
    	          when: newDate,
    	          reason: 'enroll'
    	       }));
    	      Users.update({ _id: user._id }, {
    	    	  $set: {
    	            'services.password.reset': tokenRecord
    	          }
    	      });
    	      // before passing to template, update user object with new token
    	      Meteor._ensure(user, 'services', 'password').reset = tokenRecord;
    	      const enrollLink = Accounts.urls.enrollAccount(token);
    	      const logoUrl = Meteor.absoluteUrl() + 'rh-logo.png';
    	      const parameters = {
    	          user: user.username,
    	          enrollUrl: enrollLink,
    	          logoUrl: logoUrl
    	        };
    	      const lang = user.getLanguage();
    	      const message = '<!DOCTYPE html><html lang="en"><head> <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">' + TAPi18n.__('email-enroll-text', parameters, lang);
    	      Email.send({
    	    	  to: user.emails[0].address.toLowerCase(),
    	          from: Accounts.emailTemplates.from,
    	          subject: TAPi18n.__('email-enroll-subject', parameters, lang),
    	          html: message,
    	      });
    	}
        
      } else {
      	throw new Meteor.Error('error-user-notAllowSelf');
      }
      
      return {userID: user._id, username: user.username, email: user.emails[0].address};
    }
  });

  Accounts.onCreateUser((options, user) => {
    const userCount = Users.find().count();
    if (userCount === 0) {
      user.isAdmin = true;
      return user;
    }

    if (user.services.oidc) {
      const email = user.services.oidc.email.toLowerCase();
      user.username = user.services.oidc.username;
      user.emails = [{ address: email, verified: true }];
      const initials = user.services.oidc.fullname.match(/\b[a-zA-Z]/g).join('').toUpperCase();
      user.profile = { initials, fullname: user.services.oidc.fullname, boardView: 'board-view-lists' };
      user.authenticationMethod = 'oauth2';

      // see if any existing user has this email address or username, otherwise create new
      const existingUser = Meteor.users.findOne({$or: [{'emails.address': email}, {'username':user.username}]});
      if (!existingUser)
        return user;

      // copy across new service info
      const service = _.keys(user.services)[0];
      existingUser.services[service] = user.services[service];
      existingUser.emails = user.emails;
      existingUser.username = user.username;
      existingUser.profile = user.profile;
      existingUser.authenticationMethod = user.authenticationMethod;

      Meteor.users.remove({_id: existingUser._id}); // remove existing record
      return existingUser;
    }

    if (options.from === 'admin') {
      user.createdThroughApi = true;
      return user;
    }

    const disableRegistration = Settings.findOne().disableRegistration;
    // If this is the first Authentication by the ldap and self registration disabled
    if (disableRegistration && options && options.ldap) {
      user.authenticationMethod = 'ldap';
      return user;
    }

    // If self registration enabled
    if (!disableRegistration) {
      return user;
    }

    if (!options || !options.profile) {
      throw new Meteor.Error('error-invitation-code-blank', 'The invitation code is required');
    }
    const invitationCode = InvitationCodes.findOne({
      code: options.profile.invitationcode,
      email: options.email,
      valid: true,
    });
    if (!invitationCode) {
      throw new Meteor.Error('error-invitation-code-not-exist', 'The invitation code doesn\'t exist');
    } else {
      user.profile = {icode: options.profile.invitationcode};
      user.profile.boardView = 'board-view-lists';

      // Deletes the invitation code after the user was created successfully.
      setTimeout(Meteor.bindEnvironment(() => {
        InvitationCodes.remove({'_id': invitationCode._id});
      }), 200);
      return user;
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(() => {

  	// Find any duplicate board members in a board and cleanup the duplicate
  	Boards.find().forEach((board) => {
    	const memberIds = new Array();
  		board.members.forEach((member) => {
  			memberIds.push(member.userId);
  		});
      if (memberIds.length > 1) {
    		for (var i = 0; i < memberIds.length; i++) {
      	  var AA = {};
      		AA[i] = memberIds.slice();
      		AA[i].splice( AA[i].indexOf(memberIds[i]), 1 );
    			const elementToBeRemovedUserId = memberIds[i];
      	  if (AA[i].includes(elementToBeRemovedUserId)) {
      	  	const elementToBeRemovedIsAdmin = board.members[i].isAdmin;
      	  	const elementToBeRemovedIsActive = board.members[i].isActive;
      	  	const elementToBeRemovedIsNoComments = board.members[i].isNoComments;
      	  	const elementToBeRemovedIsCommentOnly = board.members[i].isCommentOnly;
      	  	Boards.update(
    	  			{ _id: board._id },
              { $pull:
              	{ members:
              		{ userId: elementToBeRemovedUserId, },
              	},
              }
      	  	);
      	  	Boards.update(
    	  			{ _id: board._id }, {
    	  				$push: {
              		members: {
              			userId: elementToBeRemovedUserId,
              			isAdmin: elementToBeRemovedIsAdmin,
              			isActive: elementToBeRemovedIsActive,
              			isNoComments: elementToBeRemovedIsNoComments,
              			isCommentOnly: elementToBeRemovedIsCommentOnly,
              		},
              	},
              }
      	  	);
      	  }
    		}
      }
  	});
    //____________________________________


    // Let mongoDB ensure username unicity
    Users._collection._ensureIndex({
      username: 1,
    }, {unique: true});
    //____________________________________


    // Let mongoDB ensure username unicity
    UserGroups._collection._ensureIndex({
      title: 1,
    }, {unique: true});
    //____________________________________


    // Cleanup old boards of all the non-existing users as members
    const allBoards = Boards.find({archived: false});
    allBoards.forEach((board) => {
    	if (board.members.length > 0) {
    		board.members.forEach((member) => {
    			const existingUser = Users.find({_id: member.userId});
    			if (existingUser.count() < 1) {
    				Boards.update(
  						{ _id: board._id },
  						{ $pull: {
  							members: {
  								userId: member.userId
  							}
  						} }
						);
    			}
    		});
    	}
    });
    //____________________________________

  });

  // OLD WAY THIS CODE DID WORK: When user is last admin of board,
  // if admin is removed, board is removed.
  // NOW THIS IS COMMENTED OUT, because other board users still need to be able
  // to use that board, and not have board deleted.
  // Someone can be later changed to be admin of board, by making change to database.
  // TODO: Add UI for changing someone as board admin.
  //Users.before.remove((userId, doc) => {
  //  Boards
  //    .find({members: {$elemMatch: {userId: doc._id, isAdmin: true}}})
  //    .forEach((board) => {
  //      // If only one admin for the board
  //      if (board.members.filter((e) => e.isAdmin).length === 1) {
  //        Boards.remove(board._id);
  //      }
  //    });
  //});

  Users.before.insert((insertorId) => {

  	function defaultTrialUsersQuota() {
      return 5;
    }

		//	Check in AssignedUserGroup whether the user has any user group assigned to it,
		//	if so, it would in turn check if he's exhausted his quota of all the user groups assigned to him or not in order to proceed with the creation
		//	but if no user group is assigned to him, then the system needs to check in the model's collection to see how much of it has the user already created
		//	and whether he has exhausted his default trial quota
  	const userAssignedUserGroups = AssignedUserGroups.find({ userId: insertorId }, );
  	// If user has any AssignedUserGroup
  	if (userAssignedUserGroups.count() > 0) {
  		var usersQuotaLeft = 0;
  		userAssignedUserGroups.forEach((assignedUserGroup) => {
  			const userGroup = UserGroups.findOne({_id: assignedUserGroup.userGroupId});
  			if (userGroup && userGroup.usersQuota) {
  				usersQuotaLeft += userGroup.usersQuota - userGroup.usedUsersQuota
  			}
  		});
  		if (usersQuotaLeft > 0) {
  			return true;
  		} else {
	      throw new Meteor.Error('error-exhausted-users-quota');
  		}
  	}
  	// Else we check with the Default Trial 'Users Quota'
  	else {
    	const usersCreatedByCurrentUserCount = Users.find({createdBy: insertorId}).count();
			if (usersCreatedByCurrentUserCount < defaultTrialUsersQuota()) {
				return true;
			} else {
	      throw new Meteor.Error('error-exhausted-users-quota');
			}
  	}

  });

  Users.before.remove((userId, doc) => {
  	var assignedUGIds = new Array();
    AssignedUserGroups.find({userId: doc._id}).forEach((assignedUG) => {
    	assignedUGIds.push(assignedUG._id);
    });
    for (var i = 0; i < assignedUGIds.length;  i++) {
    	AssignedUserGroups.remove({_id: assignedUGIds[i]._id});
    }
  });

  // Each board document contains the de-normalized number of users that have
  // starred it. If the user star or unstar a board, we need to update this
  // counter.
  // We need to run this code on the server only, otherwise the incrementation
  // will be done twice.
  Users.after.update(function (userId, user, fieldNames) {

  	// When a user doc is updated, if his role is Admin or manager,
  	// make him a member of all the template boards of which he was not a member before
  	const templateBoards = Boards.find({
      type: 'template-board',
      archived: false,
  	});
  	const userIsAdmin = user.isAdmin;
  	const managerRole = Roles.findOne({name: 'Manager'});
  	if (managerRole && managerRole._id) {
    	var userIsManager = false;
    	if (user.roleId === managerRole._id) {
    		userIsManager = true;
    	}
    	if (userIsAdmin || userIsManager) {
      	templateBoards.forEach((templateBoard) => {
      		var isMemberAlready = false;
      		templateBoard.members.forEach((member) => {
      			if (member.userId === user._id) {
      				isMemberAlready = true;
      			}
      		});
      		if (isMemberAlready === false) {
            Boards.update(
              { _id: templateBoard._id },
              { $push: {
                  members: {
                    userId: user._id,
                    isAdmin: false,
                    isActive: true,
                    isCommentOnly: false,
                  },
                },
              }
            );
      		}
      	});
    	}
  	}
  	//_______________________//


    // The `starredBoards` list is hosted on the `profile` field. If this
    // field hasn't been modificated we don't need to run this hook.
    if (!_.contains(fieldNames, 'profile'))
      return;

    // To calculate a diff of board starred ids, we get both the previous
    // and the newly board ids list
    function getStarredBoardsIds(doc) {
      return doc.profile && doc.profile.starredBoards;
    }

    const oldIds = getStarredBoardsIds(this.previous);
    const newIds = getStarredBoardsIds(user);

    // The _.difference(a, b) method returns the values from a that are not in
    // b. We use it to find deleted and newly inserted ids by using it in one
    // direction and then in the other.
    function incrementBoards(boardsIds, inc) {
      boardsIds.forEach((boardId) => {
        Boards.update(boardId, {$inc: {stars: inc}});
      });
    }

    incrementBoards(_.difference(oldIds, newIds), -1);
    incrementBoards(_.difference(newIds, oldIds), +1);
  });

  const fakeUserId = new Meteor.EnvironmentVariable();
  const getUserId = CollectionHooks.getUserId;
  CollectionHooks.getUserId = () => {
    return fakeUserId.get() || getUserId();
  };
  if (!isSandstorm) {
    Users.after.insert((userId, doc) => {
      const fakeUser = {
        extendAutoValueContext: {
          userId: doc._id,
        },
      };

      fakeUserId.withValue(doc._id, () => {
      /*
        // Insert the Welcome Board
        Boards.insert({
          title: TAPi18n.__('welcome-board'),
          permission: 'private',
        }, fakeUser, (err, boardId) => {

          Swimlanes.insert({
            title: TAPi18n.__('welcome-swimlane'),
            boardId,
            sort: 1,
          }, fakeUser);

          ['welcome-list1', 'welcome-list2'].forEach((title, titleIndex) => {
            Lists.insert({title: TAPi18n.__(title), boardId, sort: titleIndex}, fakeUser);
          });
        });
        */

        Boards.insert({
          title: TAPi18n.__('templates'),
          permission: 'private',
          type: 'template-container',
        }, fakeUser, (err, boardId) => {

          // Insert the reference to our templates board
          Users.update(fakeUserId.get(), {$set: {'profile.templatesBoardId': boardId}});

          // Insert the card templates swimlane
          Swimlanes.insert({
            title: TAPi18n.__('card-templates-swimlane'),
            boardId,
            sort: 1,
            type: 'template-container',
          }, fakeUser, (err, swimlaneId) => {

            // Insert the reference to out card templates swimlane
            Users.update(fakeUserId.get(), {$set: {'profile.cardTemplatesSwimlaneId': swimlaneId}});
          });

          // Insert the list templates swimlane
          Swimlanes.insert({
            title: TAPi18n.__('list-templates-swimlane'),
            boardId,
            sort: 2,
            type: 'template-container',
          }, fakeUser, (err, swimlaneId) => {

            // Insert the reference to out list templates swimlane
            Users.update(fakeUserId.get(), {$set: {'profile.listTemplatesSwimlaneId': swimlaneId}});
          });

          // Insert the board templates swimlane
          Swimlanes.insert({
            title: TAPi18n.__('board-templates-swimlane'),
            boardId,
            sort: 3,
            type: 'template-container',
          }, fakeUser, (err, swimlaneId) => {

            // Insert the reference to out board templates swimlane
            Users.update(fakeUserId.get(), {$set: {'profile.boardTemplatesSwimlaneId': swimlaneId}});
          });
        });
      });
    });
  }

  Users.after.insert((userId, doc) => {

  	// When a new user is created, if his role is Admin or manager,
  	// make him a member of all the template boards of which he was not a member before
  	const templateBoards = Boards.find({
      type: 'template-board',
      archived: false,
  	});
  	const userIsAdmin = doc.isAdmin;
  	const managerRole = Roles.findOne({name: 'Manager'});
  	if (managerRole && managerRole._id) {
    	const userIsManager = false;
    	if (doc.roleId === managerRole._id) {
    		userIsManager = true;
    	}
    	if (userIsAdmin || userIsManager) {
      	templateBoards.forEach((templateBoard) => {
      		const isMemberAlready = false;
      		templateBoard.members.forEach((member) => {
      			if (member.userId === doc._id) {
      				isMemberAlready = true;
      			}
      		});
      		if (isMemberAlready === false) {
            Boards.update(
              { _id: templateBoard._id },
              { $push: {
                  members: {
                    isAdmin: false,
                    isActive: true,
                    isCommentOnly: false,
                    userId: doc._id,
                  },
                },
              }
            );
      		}
      	});
    	}
  	}
  	//_______________________//

    if (doc.createdThroughApi) {
      // The admin user should be able to create a user despite disabling registration because
      // it is two different things (registration and creation).
      // So, when a new user is created via the api (only admin user can do that) one must avoid
      // the disableRegistration check.
      // Issue : https://github.com/wekan/wekan/issues/1232
      // PR    : https://github.com/wekan/wekan/pull/1251
      Users.update(doc._id, {$set: {createdThroughApi: ''}});
      return;
    }

    //invite user to corresponding boards
    const disableRegistration = Settings.findOne().disableRegistration;
    // If ldap, bypass the inviation code if the self registration isn't allowed.
    // TODO : pay attention if ldap field in the user model change to another content ex : ldap field to connection_type
    if (doc.authenticationMethod !== 'ldap' && disableRegistration) {
      const invitationCode = InvitationCodes.findOne({code: doc.profile.icode, valid: true});
      if (!invitationCode) {
        throw new Meteor.Error('error-invitation-code-not-exist');
      } else {
        invitationCode.boardsToBeInvited.forEach((boardId) => {
          const board = Boards.findOne(boardId);
          board.addMember(doc._id);
        });
        if (!doc.profile) {
          doc.profile = {};
        }
        doc.profile.invitedBoards = invitationCode.boardsToBeInvited;
        Users.update(doc._id, {$set: {profile: doc.profile}});
        InvitationCodes.update(invitationCode._id, {$set: {valid: false}});
      }
    }
  });
}

// USERS REST API
if (Meteor.isServer) {
  // Middleware which checks that API is enabled.
  JsonRoutes.Middleware.use(function (req, res, next) {
    const api = req.url.search('api');
    if (api === 1 && process.env.WITH_API === 'true' || api === -1){
      return next();
    }
    else {
      res.writeHead(301, {Location: '/'});
      return res.end();
    }
  });

  /**
   * @operation get_current_user
   *
   * @summary returns the current user
   * @return_type Users
   */
  JsonRoutes.add('GET', '/api/user', function(req, res) {
    try {
      Authentication.checkLoggedIn(req.userId);
      const data = Meteor.users.findOne({ _id: req.userId});
      delete data.services;
      JsonRoutes.sendResult(res, {
        code: 200,
        data,
      });
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });

  /**
   * @operation get_all_users
   *
   * @summary return all the users
   *
   * @description Only the admin user (the first user) can call the REST API.
   * @return_type [{ _id: string,
   *                 username: string}]
   */
  JsonRoutes.add('GET', '/api/users', function (req, res) {
    try {
      Authentication.checkUserId(req.userId);
      JsonRoutes.sendResult(res, {
        code: 200,
        data: Meteor.users.find({}).map(function (doc) {
          return { _id: doc._id, username: doc.username };
        }),
      });
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });

  /**
   * @operation get_user
   *
   * @summary get a given user
   *
   * @description Only the admin user (the first user) can call the REST API.
   *
   * @param {string} userId the user ID
   * @return_type Users
   */
  JsonRoutes.add('GET', '/api/users/:userId', function (req, res) {
    try {
      Authentication.checkUserId(req.userId);
      const id = req.params.userId;
      JsonRoutes.sendResult(res, {
        code: 200,
        data: Meteor.users.findOne({ _id: id }),
      });
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });

  /**
   * @operation edit_user
   *
   * @summary edit a given user
   *
   * @description Only the admin user (the first user) can call the REST API.
   *
   * Possible values for *action*:
   * - `takeOwnership`: The admin takes the ownership of ALL boards of the user (archived and not archived) where the user is admin on.
   * - `disableLogin`: Disable a user (the user is not allowed to login and his login tokens are purged)
   * - `enableLogin`: Enable a user
   *
   * @param {string} userId the user ID
   * @param {string} action the action
   * @return_type {_id: string,
   *               title: string}
   */
  JsonRoutes.add('PUT', '/api/users/:userId', function (req, res) {
    try {
      Authentication.checkUserId(req.userId);
      const id = req.params.userId;
      const action = req.body.action;
      let data = Meteor.users.findOne({ _id: id });
      if (data !== undefined) {
        if (action === 'takeOwnership') {
          data = Boards.find({
            members: {
              $elemMatch: {
                userId: id,
                isAdmin: true
              }
            }
          }).map(function(board) {
            if (board.hasMember(req.userId)) {
              board.removeMember(req.userId);
            }
            board.changeOwnership(id, req.userId);
            return {
              _id: board._id,
              title: board.title,
            };
          });
        } else {
          if ((action === 'disableLogin') && (id !== req.userId)) {
            Users.update({ _id: id }, { $set: { loginDisabled: true, 'services.resume.loginTokens': '' } });
          } else if (action === 'enableLogin') {
            Users.update({ _id: id }, { $set: { loginDisabled: '' } });
          }
          data = Meteor.users.findOne({ _id: id });
        }
      }
      JsonRoutes.sendResult(res, {
        code: 200,
        data,
      });
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });

  /**
   * @operation add_board_member
   * @tag Boards
   *
   * @summary Add New Board Member with Role
   *
   * @description Only the admin user (the first user) can call the REST API.
   *
   * **Note**: see [Boards.set_board_member_permission](#set_board_member_permission)
   * to later change the permissions.
   *
   * @param {string} boardId the board ID
   * @param {string} userId the user ID
   * @param {boolean} isAdmin is the user an admin of the board
   * @param {boolean} isNoComments disable comments
   * @param {boolean} isCommentOnly only enable comments
   * @return_type {_id: string,
   *               title: string}
   */
  JsonRoutes.add('POST', '/api/boards/:boardId/members/:userId/add', function (req, res) {
    try {
      Authentication.checkUserId(req.userId);
      const userId = req.params.userId;
      const boardId = req.params.boardId;
      const action = req.body.action;
      const {isAdmin, isNoComments, isCommentOnly} = req.body;
      let data = Meteor.users.findOne({ _id: userId });
      if (data !== undefined) {
        if (action === 'add') {
          data = Boards.find({
            _id: boardId,
          }).map(function(board) {
            if (!board.hasMember(userId)) {
              board.addMember(userId);
              function isTrue(data){
                return data.toLowerCase() === 'true';
              }
              board.setMemberPermission(userId, isTrue(isAdmin), isTrue(isNoComments), isTrue(isCommentOnly), userId);
            }
            return {
              _id: board._id,
              title: board.title,
            };
          });
        }
      }
      JsonRoutes.sendResult(res, {
        code: 200,
        data: query,
      });
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });

  /**
   * @operation remove_board_member
   * @tag Boards
   *
   * @summary Remove Member from Board
   *
   * @description Only the admin user (the first user) can call the REST API.
   *
   * @param {string} boardId the board ID
   * @param {string} userId the user ID
   * @param {string} action the action (needs to be `remove`)
   * @return_type {_id: string,
   *               title: string}
   */
  JsonRoutes.add('POST', '/api/boards/:boardId/members/:userId/remove', function (req, res) {
    try {
      Authentication.checkUserId(req.userId);
      const userId = req.params.userId;
      const boardId = req.params.boardId;
      const action = req.body.action;
      let data = Meteor.users.findOne({ _id: userId });
      if (data !== undefined) {
        if (action === 'remove') {
          data = Boards.find({
            _id: boardId,
          }).map(function(board) {
            if (board.hasMember(userId)) {
              board.removeMember(userId);
            }
            return {
              _id: board._id,
              title: board.title,
            };
          });
        }
      }
      JsonRoutes.sendResult(res, {
        code: 200,
        data: query,
      });
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });

  /**
   * @operation new_user
   *
   * @summary Create a new user
   *
   * @description Only the admin user (the first user) can call the REST API.
   *
   * @param {string} username the new username
   * @param {string} email the email of the new user
   * @param {string} password the password of the new user
   * @return_type {_id: string}
   */
  JsonRoutes.add('POST', '/api/users/', function (req, res) {
    try {
      Authentication.checkUserId(req.userId);
      const id = Accounts.createUser({
        username: req.body.username,
        email: req.body.email,
        password: req.body.password,
        from: 'admin',
      });
      JsonRoutes.sendResult(res, {
        code: 200,
        data: {
          _id: id,
        },
      });
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });

  /**
   * @operation delete_user
   *
   * @summary Delete a user
   *
   * @description Only the admin user (the first user) can call the REST API.
   *
   * @param {string} userId the ID of the user to delete
   * @return_type {_id: string}
   */
  JsonRoutes.add('DELETE', '/api/users/:userId', function (req, res) {
    try {
      Authentication.checkUserId(req.userId);
      const id = req.params.userId;
      Meteor.users.remove({ _id: id });
      JsonRoutes.sendResult(res, {
        code: 200,
        data: {
          _id: id,
        },
      });
    }
    catch (error) {
      JsonRoutes.sendResult(res, {
        code: 200,
        data: error,
      });
    }
  });
}
