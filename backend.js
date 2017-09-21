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