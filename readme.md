## Dependencies
Backend: (needs to be installed in /server via yarn add)
*   [express-jwt](https://www.npmjs.com/package/express-jwt)
*   [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)
*   [config](https://www.npmjs.com/package/config) 

Frontend: (needs to be installed in /client via yarn add)
*   [jwt-decode](https://www.npmjs.com/package/jwt-decode)
*   [redux-thunk](https://www.npmjs.com/pacakage/redux-thunk)

## Backend Setup
#### Config Setup.

In your terminal, go to your /server directory. You should have already installed the config module. In your server directory, if you haven't already done this, create a `config` directory (`mkdir config`) and create a default config json file (`touch default.json`).

Open `default.json` and add these values to the root of the configuration:
```javascript
{
    ... other config options
    "secret": "lFSDFdf7weljsf3ojf$8j(*#",
    "sessionLengthInSeconds": 300000000
} 
```

>Note: the "secret" key can just be a random string you can generate online (you can do that [here](https://passwordsgenerator.net/))

#### Server Code

You will need to add a `/token` route to your api. This is the path that the frontend will call to get their token. The following example uses bcrypt to encrypt the password and it's assumed that you have a database connection object ready to go. This example can also be found in this repo as "backend.js" but should **not** be used by itself. It is meant as an example.

```javascript
const jwt = require('jsonwebtoken')

router.post("/token", function(req, res, next){
  const username = req.body.username
  const password = req.body.password

  const sql = `
    SELECT password FROM users
    WHERE username = ?
  `

  conn.query(sql, [username], function(err, results, fields){
    const hashedPassword = results[0].password

    bcrypt.compare(password, hashedPassword).then(function(result){
      if (result) {
        // notice we don't need to store tokens in the database!
        res.json({
          token: jwt.sign({username}, config.get('secret'), { expiresIn: config.get('sessionLengthInSeconds') })
        })
      } else {
        res.status(401).json({
          message: 'Invalid Credentials'
        })
      }
    }).catch(function(err){
      console.log(err)
    })
  })
})
```


## Frontend Setup
Now that we have the easy part done, let's take a look at how to implement this on the frontend.

Step 1 is to copy the `lib` folder directly into your `/src` directory inside of `/client`. There are several files in here that you are welcome to browse, but there is no need to touch them. The only file from here on out that we will use is `lib/auth.js`.

The first thing we need to do is modify how our store is created. We are going to need to add some middleware.

Inside of your store file (`/client/src/store.js`), change your store to this:

```javascript
import {createStore, combineReducers, applyMiddleware} from 'redux'
import thunkMiddleware from 'redux-thunk'
import {apiMiddleware, authReducer} from './lib/auth'

// import your reducers here
import appReducer from './reducers/app'

const createStoreWithMiddleware = applyMiddleware(thunkMiddleware, apiMiddleware)(createStore)

const rootReducer = combineReducers({
  auth: authReducer,
  app: appReducer // insert all your other reducers here
})

const store = createStoreWithMiddleware(rootReducer)

export default store
```


Now let's move on to `App.js`. We are going to import our own `<Route>` component instead of using the one supplied by `react-router-dom`. Behind the scenes, it still uses the routing code from react-router, but it adds an additional piece that we need for redirecting when someone is not logged in.

Change the line where you import react-router-dom from this:
`import {BrowserRouter as Router, Route, Switch} from 'react-router-dom'`
to this:
`import {BrowserRouter as Router, Switch} from 'react-router-dom'`

Notice how we've removed the Route from the import. Now, let's bring in the `Route` component from our auth library.

Add this line right below the react-router-dom import:
`import {AuthRoute as Route} from '../lib/auth'`

Notice, we do not need to change any of the code below. We're still using a component called `Route`.

We're almost there!

Let's create our `<Login>` form component now. You will need to modify this to suit your own display needs, but you can use the rest of it to give you the authentication you want.

```jsx
import React, { Component } from 'react'
import {loginUser, logoutUser} from '../lib/auth'
import {connect} from 'react-redux'

class Login extends Component {
  state = {
    username:'',
    password:''
  }
  componentWillMount() {
    this.props.dispatch(logoutUser())
  }
  handleSubmit = (e) => {
    e.preventDefault()
    this.props.dispatch(loginUser({username: this.state.username, password:this.state.password}))
  }
  handleChange = (e) => {
    this.setState({
      [e.target.name]:e.target.value
    })
  }
  render() {
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <input onChange={this.handleChange} type="text" placeholder="username" name="username" value={this.state.username} />
          <input onChange={this.handleChange} type="password" placeholder="password" name="password" value={this.state.password} />
          <button type="submit">Login</button>
        </form>
      </div>
    )
  }
}

function mapStateToProps(appState) {
  const {isAuthenticated, errorMessage, isFetching} = appState.auth

  return {
    isAuthenticated,
    isFetching,
    errorMessage
  }
}

export default connect(mapStateToProps)(Login)
```

That's it! Almost. This will allow you to login. All of the other pieces are already in place. The only part left is to let our application know what components we want to be secured behind a login.

Fortunately, it's pretty simple. Create your component as you normally would. We only need to add a single line to make it hide behind some authorization. Let's show you in an example:

Let's pretend we have a component called `Protected`. First thing to do is to create a `Route` to that component inside of our `App.js` file like we would any other component.

```jsx
import Protected from './components/Protected'
<Route path='/protected' component={Protected} />
```

Let's take a look at what this Protected component may look like:

```jsx
import React, { Component } from 'react'

class Protected extends Component {
  render() {
    return (
      <h1>Protected</h1>
    )
  }
}

export default Protected
```

The only thing we need to do to make this component live behind a login is to wrap this component in our Authorize() function imported from our auth lib. Like this:

```jsx
import React, { Component } from 'react'
import {Authorize} from '../lib/auth'

class Protected extends Component {
  render() {
    return (
      <h1>Protected</h1>
    )
  }
}

export default Authorize(Protected)
```

Boom. Done. If your user is not logged in, when they try and go to this component, it will redirect them back to `/login`.