Meteor.subscribe('user-admin');
Meteor.subscribe('roles');
Meteor.subscribe('boards');
Meteor.subscribe('setting');
Meteor.subscribe('user_groups');
Meteor.subscribe('assigned_user_groups');

Template.header.helpers({
  wrappedHeader() {
    return !Session.get('currentBoard');
  },

  currentSetting() {
    return Settings.findOne();
  },

  hideLogo() {
    return Utils.isMiniScreen() && Session.get('currentBoard');
  },

  appIsOffline() {
    return !Meteor.status().connected;
  },

  hasAnnouncement() {
    const announcements =  Announcements.findOne();
    return announcements && announcements.enabled;
  },

  announcement() {
    $('.announcement').show();
    const announcements =  Announcements.findOne();
    return announcements && announcements.body;
  },
  
  logoUrl(userId) {
    let defaultLogo = '/rh-header-logo.png';
    const assignedUserGroup = AssignedUserGroups.findOne({userId:userId, useCustomDefaultLogo:'Yes'});
    if (assignedUserGroup) {
        const userGroup = UserGroups.findOne({_id: assignedUserGroup.userGroupId});
        if (userGroup && userGroup._id && userGroup.logoUrl) {
            return userGroup.logoUrl
        } else {
            return defaultLogo;
        }
    }
    return defaultLogo;
  },
  
  hasDefaultBoardColor() {
	  const user = Meteor.user();
	  const board = Boards.findOne({_id: FlowRouter.current().params.id, type:'board'})
	  
	  if (board && board._id) {
	    const assignedGroups = AssignedUserGroups.findOne({ userId: Meteor.user()._id, useCustomDefaultBoardColor: 'Yes'});
	    if (assignedGroups && assignedGroups._id) {
		    return true;
	    } else {
		   return false;
	    }
	  }
  },
  
  currentBoardColor() {
	  const boards = Boards.findOne({_id: Session.get('currentBoard')});
	  const assignedUG = AssignedUserGroups.findOne({userId: Meteor.user()._id ,useCustomDefaultBoardColor: 'Yes'});
	  if (Session.get('currentBoard') && !assignedUG) {
		  const boards = Boards.findOne({_id: Session.get('currentBoard')});
		  return boards.colorClass();
	  } else{
		  return 'custom-color'
	  }
  },
  
  defaultBoardColor() {
	  var admin = '';
	  if (Session.get('currentBoard')) {
		  const boards = Boards.findOne({_id: Session.get('currentBoard')});
		  admin = boards.boardAdmin();
	  }
	  
	  const assignedUG = AssignedUserGroups.findOne({userId: admin.userId, useCustomDefaultBoardColor: 'Yes'});
	  if (assignedUG && assignedUG._id) {
		  const userGroup = UserGroups.findOne({ _id:assignedUG.userGroupId });
		  return {color:userGroup.defaultBoardColor, adjust:'brightness(90%)'};
	  }
  },
});

Template.header.events({
  'click .js-create-board': Popup.open('headerBarCreateBoard'),

  'click .js-close-announcement'() {
    $('.announcement').hide();
  },

  'click .js-select-list'() {
    Session.set('currentList', this._id);
    Session.set('currentCard', null);
  },

  'click .closeStatus': function() {
	  $('.closeStatus').parent('div').remove();
  },
});
