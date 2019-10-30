Meteor.publish('role_colors', function() {
  return RoleColors.find();
});
