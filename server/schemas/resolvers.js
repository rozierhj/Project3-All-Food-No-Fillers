const { Foodie, Comment, Reaction } = require('../models');
const { AuthenticationError } = require('apollo-server-express');
const { signToken } = require('../utils/auth');

const resolvers = {
  Query: {

    // Get the currently authenticated user
    me: async (parent, args, context) => {

      if (context.foodie) {

        //show users saved recipies
        return Foodie.findOne({ _id: context.foodie._id }).populate('savedRecipes');
      }
      throw new AuthenticationError('You must be logged in!');
    },

    //get the comments from a specific recipe
    getRecipeComments: async (parent, { recipeId }) => {
      return await Comment.find({ recipeId });
    },

    getRecipeReaction: async (parent, {recipeId}) =>{
      return await Reaction.findOne({recipeId});
    },

    getWelcomeVideo: async () => {
      const videoUrl = '../../public/welcome.mp4';
      return videoUrl;
    }
  },

  Mutation: {

    // Add a new user
    addFoodie: async (parent, { username, email, password }) => {

      //data from signup table
      const foodie = await Foodie.create({ username, email, password });

      //the JWT token
      const token = signToken(foodie);
      return { token, foodie };
    },

    // Log in a user
    login: async (parent, { email, password }) => {

      //find the user using their email
      const foodie = await Foodie.findOne({ email });

      if (!foodie) {
        throw new AuthenticationError('Incorrect credentials');
      }

      //test password
      const correctPw = await foodie.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError('Incorrect credentials');
      }

      //JWT token for signed in user
      const token = signToken(foodie);
      return { token, foodie };
    },

    // add recipe to users favorited recipes
    saveRecipe: async (parent, {recipeId, title, image, steps }, context) => {
      if (context.foodie) {
        const updatedFoodie = await Foodie.findByIdAndUpdate(
          { _id: context.foodie._id },//find user with id
          { 
            $addToSet: { 
              savedRecipes: { 
                recipeId, 
                title, 
                image, 
                steps: steps.map(step => ({
                  step: step.step,
                  ingredients: step.ingredients,
                  ingredientsImage: step.ingredientsImage,
                })),
              }, 
            }, 
          },//add data as object to recipes array
          { new: true }//update the document
        ).populate('savedRecipes');

        return updatedFoodie;
      }
      throw new AuthenticationError('You must be logged in!');
    },

    // Remove a favorited recipe
    removeRecipe: async (parent, { recipeId }, context) => {
      if (context.foodie) {
        //find the foodie by their id
        const updatedFoodie = await Foodie.findByIdAndUpdate(
          { _id: context.foodie._id },
          { $pull: { savedRecipes: { recipeId  } } },//pull the recipe from the foodies favorited recipes
          { new: true }//update document
        ).populate('savedRecipes');

        return updatedFoodie;
      }
      throw new AuthenticationError('You must be logged in!');
    },

    //add a comment to a recipe
    addComment: async (parent, {recipeId, username, text}, context) =>{
      if(context.foodie){
        //create comment, must provide comment text, users username and the id of the recipe they are commenting on
        const newComment = await Comment.create({
          text,
          username,
          recipeId,
        },
      {new:true});

        let reaction = await Reaction.findOne({recipeId});

        if(reaction){
          await resolvers.Mutation.updateReaction(parent,{reactionId: reaction._id, commentId: newComment._id})
        }
        else{
          await resolvers.Mutation.addReaction(parent,{recipeId: recipeId, commentId: newComment._id})
        }
        
       return newComment;

      }
      throw new AuthenticationError('You must be logged in to add a comment');
    },

    addReaction: async(parent,{recipeId}) =>{
      const newReaction = await Reaction.create({recipeId:recipeId, comments:[], upVotes: 0, upVoters:[] }
      );
      return newReaction;
    },

    updateReaction: async(parent, {reactionId, commentId }) =>{

      const updatedReaction = await Reaction.findByIdAndUpdate(reactionId,
        {$addToSet:{comments:commentId}},
        {new: true}
      ).populate('comments');
      return updatedReaction;

    },
    //add an upvote to a recipe
    upvoteRecipe: async (parent, {recipeId}, context) => {
      if(!context.foodie) throw new AuthenticationError('please log in to up vote');
      //test if the recipe is in the reactions collection
      let reaction = await Reaction.findOne({recipeId});

      if(reaction){

        if (!reaction.upVoters) {
          reaction.upVoters = [];
        }

      if(reaction.upVoters.includes(context.foodie._id)){

        reaction.upVotes -= 1;
        reaction.upVoters = reaction.upVoters.filter(
          (userId) => userId.toString() !== context.foodie._id.toString()
        );
      } else {

        reaction.upVotes += 1;
        reaction.upVoters.push(context.foodie._id);
      }


      }
      else{
        //if recipe was not in reactions collection then add it to the collection and set its upvotes to one
        reaction = await Reaction.create({
          recipeId,
          upVotes: 1,
          comments: [],
          upVoters: [context.foodie._id]
        });
      }

      await reaction.save();
      return reaction;
    },

    removeComment: async (parent, { commentId }, context) => {
      if (!context.foodie) throw new AuthenticationError('Please log in to remove a comment.');

      const comment = await Comment.findById(commentId);
      if (!comment) throw new AuthenticationError('Comment not found.');

      const reaction = await Reaction.findOne({ recipeId: comment.recipeId });

      if (reaction) {
        reaction.comments = reaction.comments.filter(_id => _id !== commentId);
        await reaction.save();
      }

      return reaction;
    },

    deleteComment: async (parent, { commentId }, context) => {
      if (!context.foodie) throw new AuthenticationError('Please log in to delete a comment.');

      const comment = await Comment.findById(commentId);
      if (!comment) throw new AuthenticationError('Comment not found.');

      if (comment.username !== context.foodie.username) {
        throw new AuthenticationError('You can only delete your own comment.');
      }

      await Comment.findByIdAndDelete(commentId);

      return comment;
    },

    editComment: async (parent, { commentId, newText }, context) => {
      if (!context.foodie) throw new AuthenticationError('You must be logged in to edit a comment.');
    
      // Find the comment by its ID
      const comment = await Comment.findById(commentId);
    
      if (!comment) {
        throw new Error('Comment not found');
      }
    
      // Ensure that the user is editing their own comment
      if (comment.username !== context.foodie.username) {
        throw new AuthenticationError('You can only edit your own comments');
      }
    
      // Update the comment's text
      comment.text = newText;
    
      // Save the updated comment
      await comment.save();
    
      return comment; // Return the updated comment
    },


  },
};

module.exports = resolvers;