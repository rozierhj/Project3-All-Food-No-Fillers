import { useState, useEffect } from 'react';
import {
  Container,
  Col,
  Form,
  Button,
  Card,
  Row,
} from 'react-bootstrap';
import Auth from '../utils/auth';
import axios from 'axios';
import {useMutation, useLazyQuery} from '@apollo/client';
import {GET_ME} from '../utils/queries';
import { SAVE_RECIPE } from '../utils/mutations';
import RecipeCard from '../components/RecipeCard';
import './SearchRecipes.css';
const URL = "https://api.spoonacular.com/recipes/complexSearch";
const API_KEY= "cdc727804129496c8ed7564453c15133";

const SearchRecipes = () => {
  // create state for holding returned google api data
  const [searchedRecipes, setSearchedRecipes] = useState([]);
  const [showRecipeCard, setShowRecipeCard] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  // create state for holding our search field data
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    // Check if 'searchedRecipes' exists in localStorage
    const storedRecipes = localStorage.getItem('searchedRecipes');
    
    if (storedRecipes) {
      // If it exists, load the stored recipes into the state
      setSearchedRecipes(JSON.parse(storedRecipes));
    } else {
      // If it doesn't exist, initialize it with an empty array in localStorage
      localStorage.setItem('searchedRecipes', JSON.stringify([]));
    }
  }, []);


  //fetch the logged-in user's data (GET_ME query) when needed.
 const [getMe, {data: meData}] = useLazyQuery(GET_ME);

 //save a book to the user's savedBooks list using the SAVE_BOOK mutation.
  const [saveRecipe] = useMutation(SAVE_RECIPE,{

    //update the Apollo Client cache with the users new saved book
    update(cache, {data: {saveRecipe}}) {
      try{
          const {me} = cache.readQuery({query: GET_ME});

          cache.writeQuery({
            query:GET_ME,
            data: {me: {...me, savedRecipes:[...me.savedRecipes, saveRecipe]}},
          });
      }
      catch(err){
        console.log('error in updating the cache after saving the book', err)
      }
    }
  });

  // search for books and set state on form submit
  const handleFormSubmit = async (event) => {
    event.preventDefault();

    if (!searchInput) {
      return false;
    }

    try {
      //the google book api that is getting value from book search field
      // const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${searchInput}`);
      const response = await axios.get('https://api.spoonacular.com/recipes/complexSearch', {
        params: {
          query: searchInput, // The name of the recipe to search for
          number: 5, // Limit the results to 5
          apiKey: `${API_KEY}`, // Replace with your Spoonacular API key
        },
      });
      console.log(response);
      if (!response) {
        throw new Error('something went wrong!');
      }

      const  items  = response.data.results;
      console.log(items);
      //get the data from the books returned in the google book api
      const recipeData = items.map((recipe) => ({
        recipeId: recipe.id,
        // authors: book.volumeInfo.authors || ['No author to display'],
        title: recipe.title,
        // description: book.volumeInfo.description,
        image: recipe.image || '',
        // link: book.accessInfo.webReaderLink,
      }));

      //update searchbook state
      setSearchedRecipes(recipeData);
      localStorage.setItem('searchedRecipes', JSON.stringify(recipeData));
      //reset searchinput state
      setSearchInput('');

      //get user data who is logged in
      if (Auth.loggedIn()) {
        getMe();
      }

    } catch (err) {
      console.error(err);
    }
  };

  // saving a book to our database
  const handleSaveRecipe = async (recipeId) => {

    // find the book in `searchedBooks` state by the matching id
    const recipeToSave = searchedRecipes.find((recipe) => recipe.recipeId === recipeId);

    //if use not authentice then leave
    if (!Auth.loggedIn()) {
      return false;
    }

    //adding the book to the existing database for that user
    try {
      await saveRecipe({
        variables: { ...recipeToSave },
      });

      // Fetch updated user data after saving the book
      getMe();
    } catch (err) {
      console.error('Error saving the recipe!', err);
    }
  };

  const handleShowRecipeCard = (recipe) =>{
    setSelectedRecipe(recipe);
    setShowRecipeCard(true);
  }

  const handleCloseRecipeCard = () =>{
    setShowRecipeCard(false);
    setSelectedRecipe(null);
  }

  //loop through all saved books and grab bookid or return empty array
  const savedRecipeIds = meData?.me?.savedRecipes?.map(recipe => recipe.recipeId) || [];

  return (
    <>
      <div className="text-light bg-dark p-5">
        <Container>
          <h1>Find Delicious Recipes!</h1>
          <Form onSubmit={handleFormSubmit}>
            <Row>
              <Col xs={12} md={8}>
                <Form.Control
                  name='searchInput'
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  type='text'
                  size='lg'
                  placeholder='bon appetit'
                />
              </Col>
              <Col xs={12} md={4}>
                <Button type='submit' variant='success' size='lg'>
                  Find Recipe
                </Button>
              </Col>
            </Row>
          </Form>
        </Container>
      </div>
    <div className='recipes'>
      <Container>
        <h2 className='pt-5'>
          {searchedRecipes.length
            ? `Viewing ${searchedRecipes.length} results:`
            : 'Start by Searching Recipes'}
        </h2>
        <Row>
          {searchedRecipes.map((recipe) => (
            <Col className='oneCard' md="4" key={recipe.recipeId}>
              <Card border='dark'>
                {recipe.image && (
                  <Card.Img src={recipe.image} alt={`The cover for ${recipe.title}`} variant='top' />
                )}
                <Card.Body>
                  <Card.Title>{recipe.title}</Card.Title>
                  <Card.Text>Recipe Description</Card.Text>
                  <Button variant="primary" onClick={() => handleShowRecipeCard(recipe)}>
                    View Details
                  </Button>
                  {Auth.loggedIn() && (
                    <Button
                      disabled={savedRecipeIds?.some((savedRecipeId) => savedRecipeId === recipe.recipeId)}
                      className='btn-block btn-info mt-2'
                      onClick={() => handleSaveRecipe(recipe.recipeId)}>
                      {savedRecipeIds?.some((savedRecipeId) => savedRecipeId === recipe.recipeId)
                        ? 'This recipe is a favorite!'
                        : 'Save this recipe!'}
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
          </div>
          <RecipeCard
            show={showRecipeCard}
            handleClose={handleCloseRecipeCard}
            recipe={selectedRecipe}
          />
    </>
  );
};

export default SearchRecipes;
