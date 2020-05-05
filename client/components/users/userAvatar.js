Template.userAvatar.onCreated(() => {
  // This is part 1 of 2 of the subscription to the collections
  // It important to have both parts as otherwise we will not
  // be able to fetch the collections correctly in the model Cards
  // of its method unassignTeamMember
  Meteor.subscribe('team_members_scores');
  Meteor.subscribe('team_members_aspects');
});

Template.userAvatar.onRendered(() => {
  // This is part 2 of 2 of the subscription to the collections
  // It important to have both parts as otherwise we will not
  // be able to fetch the collections correctly in the model Cards
  // of its method unassignTeamMember
  Meteor.subscribe('team_members_scores');
  Meteor.subscribe('team_members_aspects');

  const selector = $('.card-details-item-teamMembers').find('.member.js-member');
  selector.addClass('team-member');
  selector.css('cursor', 'default');
});

Template.userAvatar.helpers({
  userData() {
    // We need to handle a special case for the search results provided by the
    // `matteodem:easy-search` package. Since these results gets published in a
    // separate collection, and not in the standard Meteor.Users collection as
    // expected, we use a component parameter ("property") to distinguish the
    // two cases.
    const userCollection = this.esSearch ? ESSearchResults : Users;
    return userCollection.findOne(this.userId, {
      fields: {
      	_id: 1,
        profile: 1,
        username: 1,
      },
    });
  },

  memberType() {
    const user = Users.findOne(this.userId);
    return user && user.isBoardAdmin() ? 'admin' : 'normal';
  },

  presenceStatusClassName() {
    const user = Users.findOne(this.userId);
    const userPresence = presences.findOne({ userId: this.userId });
    if (user && user.isInvitedTo(Session.get('currentBoard')))
      return 'pending';
    else if (!userPresence)
      return 'disconnected';
    else if (Session.equals('currentBoard', userPresence.state.currentBoardId))
      return 'active';
    else
      return 'idle';
  },

  viewPortWidth() {
    const user = Users.findOne(this.userId);
    return (user && user.getInitials().length || 1) * 12;
  },

  isForActivitiesList() {
    if (Template.parentData() && Template.parentData().activityType) {
      return true;
    } else {
      return false;
    }
  },

  isForUnopenedAndOpenedCardMembersAvatars() {
    if (Template.parentData() && typeof Template.parentData() === 'string') {
      return true;
    } else {
      return false;
    }
  },

  isForNavBar() {
    if (Template.parentData() && 
        typeof Template.parentData() === 'object' && 
        !Template.parentData().type && 
        !Template.parentData().activityType && 
        !Template.parentData().userId
    ) {
      return true;
    } else {
      return false;
    }
  },
});

Template.userAvatar.events({
  'click .js-change-avatar': Popup.open('changeAvatar'),
});

Template.userAvatarInitials.helpers({
	currentUserId() {
		return this.userId;
	},

  initials() {
    const user = Users.findOne(this.userId);
    if (user) {
      var userInitials = user.getInitials();
      if (userInitials.length > 3) {
      	userInitials = userInitials.substring(0,3);
      }
      return user && userInitials;
    }
    return null;
  },

  oneInitial() {
    const user = Users.findOne(this.userId);
    if (user) {
	    var userInitials = user.getInitials();
	    if (userInitials.length == 1) {
	    	return true;
	    }
	  	return false;
    }
    return null;
  },

  twoInitials() {
    const user = Users.findOne(this.userId);
    if (user) {
	    var userInitials = user.getInitials();
	    if (userInitials.length == 2) {
	    	return true;
	    }
	  	return false;
    }
    return null;
  },

  threeInitials() {
    const user = Users.findOne(this.userId);
    if (user) {
	    var userInitials = user.getInitials();
	    if (userInitials.length == 3) {
	    	return true;
	    }
	  	return false;
    }
    return null;
  },

  moreThanThreeInitials() {
    const user = Users.findOne(this.userId);
    if (user) {
	    var userInitials = user.getInitials();
	    if (userInitials.length > 3) {
	    	return true;
	    }
	  	return false;
    }
    return null;
  },

  viewPortWidth() {
    const user = Users.findOne(this.userId);
    return (user && user.getInitials().length || 1) * 12;
  },
});

BlazeComponent.extendComponent({
  onCreated() {
    this.error = new ReactiveVar('');

    Meteor.subscribe('my-avatars');
  },

  avatarUrlOptions() {
    return {
      auth: false,
      brokenIsFine: true,
    };
  },

  uploadedAvatars() {
    return Avatars.find({userId: Meteor.userId()});
  },

  isSelected() {
    const userProfile = Meteor.user().profile;
    const avatarUrl = userProfile && userProfile.avatarUrl;
    const currentAvatarUrl = this.currentData().url(this.avatarUrlOptions());
    return avatarUrl === currentAvatarUrl;
  },

  noAvatarUrl() {
    const userProfile = Meteor.user().profile;
    const avatarUrl = userProfile && userProfile.avatarUrl;
    return !avatarUrl;
  },

  setAvatar(avatarUrl) {
    Meteor.user().setAvatarUrl(avatarUrl);
  },

  setError(error) {
    this.error.set(error);
  },

  events() {
    return [{
      'click .js-upload-avatar'() {
        this.$('.js-upload-avatar-input').click();
      },
      'change .js-upload-avatar-input'(evt) {
        let file, fileUrl;

        FS.Utility.eachFile(evt, (f) => {
          try {
            var fileObj = new FS.File(f);
            fileObj.name(Math.random().toString(36));
            file = Avatars.insert(fileObj);
            fileUrl = file.url(this.avatarUrlOptions());
          } catch (e) {
            this.setError('avatar-too-big');
          }
        });

        if (fileUrl) {
          this.setError('');
          const fetchAvatarInterval = window.setInterval(() => {
            $.ajax({
              url: fileUrl,
              success: () => {
                this.setAvatar(file.url(this.avatarUrlOptions()));
                window.clearInterval(fetchAvatarInterval);
              },
            });
          }, 100);
        }
      },
      'click .js-select-avatar'() {
        const avatarUrl = this.currentData().url(this.avatarUrlOptions());
        this.setAvatar(avatarUrl);
      },
      'click .js-select-initials'() {
        this.setAvatar('');
      },
      'click .js-delete-avatar'() {
        Avatars.remove(this.currentData()._id);
      },
    }];
  },
}).register('changeAvatarPopup');

Template.cardMembersPopup.helpers({
  isCardMember() {
    const card = Template.parentData();
    const cardMembers = card.getMembers();

    return _.contains(cardMembers, this.userId);
  },

  user() {
    return Users.findOne(this.userId);
  },
});

Template.cardMembersPopup.events({
  'click .js-select-member'(evt) {
    const card = Cards.findOne(Session.get('currentCard'));
    const memberId = this.userId;
    card.toggleMember(memberId);
    evt.preventDefault();
  },
});

Template.cardTeamMembersPopup.helpers({
  isCardTeamMember() {
    const card = Template.parentData();
    const cardTeamMembers = card.getTeamMembers();

    return _.contains(cardTeamMembers, this._id);
  },

  hasEligibleFutureTeamUsers() {
  	const card = Cards.findOne(this._id);
    if (card && card._id) {
    	const teamUsers = card.getTeamUsers();
      if (teamUsers.count() > 0) {
      	return true;
      } else {
      	return false;
      }
    } else {
    	return false;
    }
  },

  teamUsers() {
  	const card = Cards.findOne(this._id);
    return card.getTeamUsers();
  },

  user() {
    return Users.findOne(this._id);
  },
});

Template.cardTeamMembersPopup.events({
  'click .js-select-teamMember'(evt) {
    const card = Cards.findOne(Session.get('currentCard'));
    const teamMemberId = this._id;
    card.toggleTeamMember(teamMemberId);
    evt.preventDefault();
  },
});

Template.cardMemberPopup.helpers({
  user() {
    return Users.findOne(this.userId);
  },
});

Template.cardMemberPopup.events({
  'click .js-remove-member'() {
    Cards.findOne(this.cardId).unassignMember(this.userId);
    Popup.close();
  },
  'click .js-edit-profile': Popup.open('editProfile'),
});
