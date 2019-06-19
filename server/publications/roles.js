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
  const user = Users.findOne(this.userId);
  if (!user.roleId) {
    return this.ready();
  }
  return Roles.find(user.roleId);
});
