const { Schema, model } = require('mongoose');
const bcrypt = require('bcrypt');

// import schema from Recipe.js
const recipeSchema = require('./Recipe');

const foodieSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/.+@.+\..+/, 'Must use a valid email address'],
    },
    password: {
      type: String,
      required: true,
    },
    
    savedRecipes: [recipeSchema],
  },
  // set this to use virtual below
  {
    toJSON: {
      virtuals: true,
    },
  }
);

// hash user password
foodieSchema.pre('save', async function (next) {
  if (this.isNew || this.isModified('password')) {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
  }

  next();
});

// custom method to compare and validate password for logging in
foodieSchema.methods.isCorrectPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

// when we query a user, we'll also get another field called `recipeCount` with the number of saved recipes we have
foodieSchema.virtual('recipeCount').get(function () {
  return this.savedRecipes.length;
});

const Foodie = model('Foodie', foodieSchema);

module.exports = Foodie;