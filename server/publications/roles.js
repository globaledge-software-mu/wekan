Meteor.publish('roles', function() {
  if (!this.user.isAdmin) {
    return this.ready();
  }
  return Roles.find();
});

/* Currently logged user's role */
Meteor.publish('role', function() {
  if (!Match.test(this.userId, String)) {
    return this.ready();
  }
  if (!this.user.roleId) {
    return null;
  }
  return Roles.find(this.user.roleId);
});
