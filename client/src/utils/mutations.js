import { gql } from '@apollo/client';

export const ADD_FOODIE = gql`
  mutation addFoodie($username: String!, $email: String!, $password: String!) {
    addFoodie(username: $username, email: $email, password: $password) {
      token
      foodie {
        _id
        username
        email
      }
    }
  }
`;

export const LOGIN_FOODIE = gql`
  mutation login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      foodie {
        _id
        username
        email
      }
    }
  }
`;

export const SAVE_RECIPE = gql`
  mutation saveRecipe($recipeId: Int!, $title: String, $image: String) {
    saveRecipe(recipeId: $recipeId,  title: $title, image: $image) {
      _id
      username
      email
      savedRecipes {
        recipeId
        title
        image
      }
    }
  }
`;

export const REMOVE_RECIPE = gql`
  mutation removeRecipe($recipeId: Int!) {
    removeRecipe(recipeId: $recipeId) {
      _id
      username
      email
      savedRecipes {
        recipeId
        title
        image
      }
    }
  }
`;

export const ADD_COMMENT = gql`

mutation addComment($recipeid: Int!, $username: String! $text: String!){
  addComment(recipeid:  $recipeId, username: $username, text: $text){
  
    _id
  text
  username
  recipeId
  
  }
}

`;


