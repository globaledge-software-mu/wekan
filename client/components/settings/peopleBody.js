const usersPerPage = 25;

BlazeComponent.extendComponent({
  mixins() {
    return [Mixins.InfiniteScrolling];
  },
  onCreated() {
    this.error = new ReactiveVar('');
    this.loading = new ReactiveVar(false);
    this.people = new ReactiveVar(true);
    this.roles = new ReactiveVar(false);
    this.findUsersOptions = new ReactiveVar({});
    this.findRolesOptions = new ReactiveVar({});
    this.number = new ReactiveVar(0);

    this.page = new ReactiveVar(1);
    this.loadNextPageLocked = false;
    this.callFirstWith(null, 'resetNextPeak');
    this.autorun(() => {
      const limit = this.page.get() * usersPerPage;

      this.subscribe('people', limit, () => {
        this.loadNextPageLocked = false;
        const nextPeakBefore = this.callFirstWith(null, 'getNextPeak');
        this.calculateNextPeak();
        const nextPeakAfter = this.callFirstWith(null, 'getNextPeak');
        if (nextPeakBefore === nextPeakAfter) {
          this.callFirstWith(null, 'resetNextPeak');
        }
      });
      this.subscribe('roles');
      Meteor.subscribe('users');
    });
  },
  events() {
    return [{
      'click #searchButton'() {
        this.filterPeople();
      },
      'keydown #searchInput'(event) {
        if (event.keyCode === 13 && !event.shiftKey) {
          this.filterPeople();
        }
      },
    }];
  },
  filterPeople() {
    const value = $('#searchInput').first().val();
    if (value === '') {
      this.findUsersOptions.set({});
    } else {
      const regex = new RegExp(value, 'i');
      this.findUsersOptions.set({
        $or: [
          { username: regex },
          { 'profile.fullname': regex },
          { 'emails.address': regex },
        ],
      });
    }
  },
  loadNextPage() {
    if (this.loadNextPageLocked === false) {
      this.page.set(this.page.get() + 1);
      this.loadNextPageLocked = true;
    }
  },
  calculateNextPeak() {
    const element = this.find('.main-body');
    if (element) {
      const altitude = element.scrollHeight;
      this.callFirstWith(this, 'setNextPeak', altitude);
    }
  },
  reachNextPeak() {
    this.loadNextPage();
  },
  setError(error) {
    this.error.set(error);
  },
  setLoading(w) {
    this.loading.set(w);
  },
  peopleList() {
    const users = Users.find();
    this.number.set(users.count());
    return users;
  },
  managerUsersList() {
    const role = Roles.findOne({name: 'Manager'});
    const users = Users.find({
      $nor: [
        { isAdmin: true },
        { roleId: role._id }
      ]
    });
    this.number.set(users.count());
    return users;
  },
  coachUsersList() {
    const managerRole = Roles.findOne({name: 'Manager'});
    const coachRole = Roles.findOne({name: 'Coach'});
    const users = Users.find({
      $nor: [
        { isAdmin: true },
        { roleId: managerRole._id },
        { roleId: coachRole._id }
      ]
    });
    this.number.set(users.count());
    return users;
  },
  peopleNumber() {
    return this.number.get();
  },
  roleList() {
    const roles = Roles.find(this.findRolesOptions.get(), {
      sort: ['name'],
    });
    var count = roles.count();
    this.number.set(roles.count());
    return roles;
  },
  switchMenu(event) {
    const target = $(event.target);
    if (!target.hasClass('active')) {
      $('.side-menu li.active').removeClass('active');
      target.parent().addClass('active');
      const targetID = target.data('id');
      this.people.set('people-setting' === targetID);
      this.roles.set('roles-setting' === targetID);
    }
  },
  events() {
    return [{
      'click a.js-setting-menu': this.switchMenu,
    }];
  },
}).register('people');

Template.peopleRow.helpers({
  userData() {
    const userCollection = this.esSearch ? ESSearchResults : Users;
    return userCollection.findOne(this.userId);
  },
  roleName() {
    const userCollection = this.esSearch ? ESSearchResults : Users;
    let user = userCollection.findOne(this.userId);
    if (!user.roleId) {
      return '-';
    }
    let role = Roles.findOne(user.roleId);
    return role.name;
  }
});

Template.roleRow.helpers({
  roleData() {
    return Roles.findOne(this.roleId);
  },
});

Template.editUserPopup.onCreated(function() {
  this.authenticationMethods = new ReactiveVar([]);
  this.errorMessage = new ReactiveVar('');

  Meteor.call('getAuthenticationsEnabled', (_, result) => {
    if (result) {
      // TODO : add a management of different languages
      // (ex {value: ldap, text: TAPi18n.__('ldap', {}, T9n.getLanguage() || 'en')})
      this.authenticationMethods.set([
        {value: 'password'},
        // Gets only the authentication methods availables
        ...Object.entries(result).filter((e) => e[1]).map((e) => ({value: e[0]})),
      ]);
    }
  });
});

Template.editUserPopup.helpers({
  user() {
    return Users.findOne(this.userId);
  },
  authentications() {
    return Template.instance().authenticationMethods.get();
  },
  isSelected(match) {
    const userId = Template.instance().data.userId;
    const selected = Users.findOne(userId).authenticationMethod;
    return selected === match;
  },
  roles() {
    return Roles.find({});
  },
  currentRole(match) {
    const userId = Template.instance().data.userId;
    const selected = Users.findOne(userId).roleId;
    return selected === match;
  },
  coachOrCoacheeRoles() {
    return Roles.find({
      $or: [{ name: 'Coach' }, { name: 'Coachee' }]
    });
  },
  coacheeRole() {
    return Roles.findOne({ name: 'Coachee' });
  },
  isLdap() {
    const userId = Template.instance().data.userId;
    const selected = Users.findOne(userId).authenticationMethod;
    return selected === 'ldap';
  },
  errorMessage() {
    return Template.instance().errorMessage.get();
  },
});

BlazeComponent.extendComponent({
  onCreated() {
  },
  user() {
    return Users.findOne(this.userId);
  },
  events() {
    return [{
      'click a.edit-user': Popup.open('editUser'),
    }];
  },
}).register('peopleRow');

Template.editUserPopup.events({
  submit(evt, tpl) {
    evt.preventDefault();
    const user = Users.findOne(this.userId);
    const fullname = tpl.find('.js-profile-fullname').value.trim();
    const username = tpl.find('.js-profile-username').value.trim();
    const password = tpl.find('.js-profile-password').value;
    const isAdmin = tpl.find('.js-profile-isadmin').value.trim();
    const roleId = tpl.find('.js-profile-role').value;
    const isActive = tpl.find('.js-profile-isactive').value.trim();
    const email = tpl.find('.js-profile-email').value.trim();
    const authentication = tpl.find('.js-authenticationMethod').value.trim();

    const isChangePassword = password.length > 0;
    const isChangeUserName = username !== user.username;
    const isChangeEmail = email.toLowerCase() !== user.emails[0].address.toLowerCase();

    Users.update(this.userId, {
      $set: {
        'profile.fullname': fullname,
        'isAdmin': isAdmin === 'true',
        'roleId': roleId,
        'loginDisabled': isActive === 'true',
        'authenticationMethod': authentication,
      },
    });

    if(isChangePassword){
      Meteor.call('setPassword', password, this.userId);
    }

    if (isChangeUserName && isChangeEmail) {
      Meteor.call('setUsernameAndEmail', username, email.toLowerCase(), this.userId, function (error) {
        const usernameMessageElement = tpl.$('.username-taken');
        const emailMessageElement = tpl.$('.email-taken');
        if (error) {
          const errorElement = error.error;
          if (errorElement === 'username-already-taken') {
            usernameMessageElement.show();
            emailMessageElement.hide();
          } else if (errorElement === 'email-already-taken') {
            usernameMessageElement.hide();
            emailMessageElement.show();
          }
        } else {
          usernameMessageElement.hide();
          emailMessageElement.hide();
          Popup.close();
        }
      });
    } else if (isChangeUserName) {
      Meteor.call('setUsername', username, this.userId, function (error) {
        const usernameMessageElement = tpl.$('.username-taken');
        if (error) {
          const errorElement = error.error;
          if (errorElement === 'username-already-taken') {
            usernameMessageElement.show();
          }
        } else {
          usernameMessageElement.hide();
          Popup.close();
        }
      });
    } else if (isChangeEmail) {
      Meteor.call('setEmail', email.toLowerCase(), this.userId, function (error) {
        const emailMessageElement = tpl.$('.email-taken');
        if (error) {
          const errorElement = error.error;
          if (errorElement === 'email-already-taken') {
            emailMessageElement.show();
          }
        } else {
          emailMessageElement.hide();
          Popup.close();
        }
      });
    } else Popup.close();
  },

  'click #deleteButton'() {
    Users.remove(this.userId);
    Popup.close();
  },
});

BlazeComponent.extendComponent({
  onCreated() {
  },
  roles() {
    return Roles.find({}, {
      sort: ['name']
    });
  },
  events() {
    return [{
      'click button.js-open-create-role': Popup.open('createRole'),
    }];
  },
}).register('rolesGeneral');

BlazeComponent.extendComponent({
  onCreated() {
  },
  events() {
    return [{
      'click a.edit-role': Popup.open('createRole'),
    }];
  },
}).register('roleRow');


Template.createRolePopup.events({
  submit(evt, tpl) {
    evt.preventDefault();
    let permissions = [];
    tpl.$('.js-permission.is-checked').each(function(id, elem) {
      let group = $(elem).parents('tr').data('group');
      let access = $(elem).data('access');
      permissions.push({group:group, access:access});
    });
    const name = tpl.find('.js-role-name').value.trim();

    // insert or update
    if (!this.roleId) {
      Roles.insert({
        'name': name,
        'permissions': permissions,
      });
    } else {
      Roles.update(this.roleId, {
        $set: {
          'name': name,
          'permissions': permissions,
        },
      });
    }

    Popup.close();
  },

  'click .js-permission'(evt) {
    let $target = $(evt.target);
    if(!$target.hasClass('js-permission')){
      $target = $target.parent();
    }
    $target.find('.materialCheckBox').toggleClass('is-checked');
    $target.toggleClass('is-checked');
  },
  'click #deleteButton'() {
    Roles.remove(this.roleId);
    Popup.close();
  },
});
Template.createRolePopup.helpers({
  isEnabled(role, group, access) {
    if (!role) {
      return false;
    }
    for (var i in role.permissions) {
      if (role.permissions[i].group == group && role.permissions[i].access == access)
        return true;
    }
    return false;
  },
  groups() {
    return Roles.groups;
  },
  role() {
    return Roles.findOne(this.roleId);
  },
});
