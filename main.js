var express = require('express')
var app = express()
var bodyParser = require('body-parser');
var compression = require('compression');
var sanitizeHtml = require('sanitize-html');
var fs = require('fs');
 
var multer  = require('multer')
// var upload = multer({dest:'uploads/'})
 
// var storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/')
//   },
//   filename: function (req, file, cb) {
//     cb(null, file.originalname)
//   }
// })
// var upload = multer({ storage: storage })
var storage = multer.memoryStorage()
var upload = multer({ storage: storage })

var low = require('lowdb');
var FileSync = require('./node_modules/lowdb/adapters/FileSync');
var adapter = new FileSync('db.json');
var db = low(adapter);
db.defaults({
  books: [],
  chapters: [],
  words:[]
}).write();

var template = {
    HTML:function(title, list, body, control, authStatusU){
      return `
      <!doctype html>
      <html>
      <head>
        <title>WEB  - ${title}</title>
        <meta charset="utf-8">
      </head>
      <body>
        <h1><a href="/">vocabulary</a></h1>
        <a href="/book/list">books</a>
        <a href="/book/list">words</a><br>
        ${list}
        ${body}
        ${control}
      </body>
      </html>
      `;
    },wordlist:function(filelist){
      var list = `<br><table border='1' style="border: 1px solid black;border-collapse:collapse;">
      <tr><th>words</th><th>meaning</th></tr>`;
      var i = 0;
      while((filelist) && i < filelist.length){
        list = list + `<tr>
        <td><a href="/word/${filelist[i].id}">${filelist[i].title}</a></td>
        <td>${filelist[i].meaning}</td>
        </tr>`;
        i = i + 1;
      }
      list = list+'</table>'; 
      return list;
    },chapterlist:function(filelist){
      var list = `<br> <table border='1' style="border: 1px solid black;border-collapse:collapse;">
      <tr><th>chapters</th></tr>`;
      var i = 0;
      while((filelist) && i < filelist.length){
        list = list + `<tr>
        <td><a href="/chapter/${filelist[i].id}">${filelist[i].title}</a></td>
        </tr>`;
        i = i + 1;
      }
      list = list+'</table>'; 
      return list;
    },
    booklist:function(filelist){
      var list = `<br><table border='1' style="border: 1px solid black;border-collapse:collapse;">
      <tr><th>title</th><th>author</th></tr>`;
      var i = 0;
      while((filelist) && i < filelist.length){
        list = list + `<tr>
        <td><a href="/book/${filelist[i].id}">${filelist[i].title}</a></td>
        <td>${filelist[i].author}</td>
        </tr>`;
        i = i + 1;
      }
      list = list+'</table>'; 
      return list;
    }
  }
var control = {
  bookUI:function(request, response,book_id){
    var authTopicUI =  '<br> <a href="/book/create">new book</a>'
    if(book_id){
      authTopicUI = `<br> <a href="/chapter/create/${book_id}">+chapter</a> 
      <a href="/book/update/${book_id}">edit</a>
      <form action="/book/delete_process" method="post" style="display: inline-block;">
        <input type="hidden" name="id" value="${book_id}">
        <input type="submit" value="delete">
      </form>`;
    }
    return authTopicUI;
  },
  chapterUI:function(request, response,chapter){
    return `<br> <a href="/word/create/${chapter.id}">+word</a> 
      <a href="/chapter/update/${chapter.id}">rename</a>
      <form action="/chapter/delete_process" method="post" style="display: inline-block;">
        <input type="hidden" name="id" value="${chapter.id}">
        <input type="hidden" name="book_id" value="${chapter.book_id}">
        <input type="submit" value="delete">
      </form>
      <br> 
      <form action="/word/import" method="POST" enctype="multipart/form-data" style="display: inline-block;">
      <input type="file" name="myfile" accept="text/*" onchange="this.form.submit()">
      <input type="hidden" name="chapter_id" value="${chapter.id}">
      </form>`;
  },
  wordUI:function(request, response, word){
    return `<br> 
      <a href="/word/update/${word.id}">edit</a>
      <form action="/word/delete_process" method="post" style="display: inline-block;">
        <input type="hidden" name="id" value="${word.id}">
        <input type="hidden" name="chapter_id" value="${word.chapter_id}">
        <input type="submit" value="delete">
      </form>
      <br> 
      `;
  }
}   
var shortid = require('shortid');

var helmet = require('helmet');
app.use(helmet())
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended:false}))
app.use(compression());
app.use('/static',express.static('uploads'));


// app.get('*',function(request, response, next){
  //   // request.id = '';
  //   console.log('*',request.id);
  //     next()
  // })
  

app.get('/', function (request, response) {
    var html = template.HTML('', '',
      `
      <h2></h2>Hello, Node.js`,
      '',
      ''
    );
    response.send(html)
  })

  app.get('/book/list', function (request, response) {
    var books = db.get('books').value();
    var title = '';
    var description = '';
    var list = template.booklist(books);
    var html = template.HTML(title, list,
      `<h2>${title}</h2>${description}`,
      control.bookUI(request, response),
      ''
    );
    response.send(html)
  })

  app.get('/book/create', function (request, response) {
    var title = 'WEB - create';
    var list = '';
    var html = template.HTML(title, list, `
        <form action="/book/create_process" method="post">
          <p><input type="text" name="title" placeholder="title"></p>
          <p><input type="text" name="author" placeholder="author"></p>
          <p><input type="submit" value="create"></p>
        </form>
      `, '', '');
    response.send(html);
  })

  app.post('/book/create_process', function (request, response) {
    var post = request.body;
    var title = post.title;
    var author = post.author;
    var id = shortid.generate();
    db.get('books').push({
      id: id,
      title: title,
      author: author,
    }).write();
    response.redirect(`/book/list`);
  })

  app.get('/book/:bookId', function (request, response) {
    var book = db.get('books').find({
      id: request.params.bookId
    }).value();
    var chapters = db.get('chapters').filter({
      book_id: book.id
    }).value();
    var title = '';
    var description = '';
    var list = template.chapterlist(chapters);
    var html = template.HTML(title, '',
      `<br>${book.title} by ${book.author}
      ${list}`,
      control.bookUI(request, response, book.id),
      '' 
    );
    response.send(html)
  })

  app.get('/book/update/:bookId', function (request, response) {
    var book = db.get('books').find({id:request.params.bookId}).value();
    var title = '';
    var list = '';
    var html = template.HTML(title, list,
      `<form action="/book/update_process" method="post">
        <input type="hidden" name="id" value="${book.id}">
        <p><input type="text" name="title" placeholder="title" value="${book.title}"></p>
        <p><input type="text" name="author" placeholder="author" value="${book.author}"></p>
        <p><input type="submit" value="update"></p>
      </form>
      `,'',''
    );
    response.send(html);
  })

  app.post('/book/update_process', function (request, response) {
    var post = request.body;
    var id = post.id;
    var title = post.title;
    var author = post.author;
    db.get('books').find({id:id}).assign({title:title, author:author}).write();
    response.redirect(`/book/${id}`)
  })

  app.post('/book/delete_process', function (request, response) {
    var post = request.body;
    var id = post.id;
    db.get('books').remove({id:id}).write();
    response.redirect('/book/list');
  })


  app.get('/chapter/create/:bookId', function (request, response) {
    var book = db.get('books').find({id:request.params.bookId}).value();
    var title = 'WEB - create';
    var list = '';
    var html = template.HTML(title, list, `
    <br><b>${book.title}</b> by ${book.author}
        <form action="/chapter/create_process" method="post">
          <input type="hidden" name="book_id" value="${book.id}">
          <p><input type="text" name="chapter" placeholder="chapter"></p>
          <p><input type="submit" value="create chapter"></p>
        </form>
      `, '', '');
    response.send(html);
  })

  app.post('/chapter/create_process', function (request, response) {
    var post = request.body;
    var book_id = post.book_id;
    var chapter = post.chapter;
    var id = shortid.generate();
    db.get('chapters').push({
      id: id,
      title: chapter,
      book_id: book_id,
    }).write();
    response.redirect(`/book/${book_id}`);
  })

  app.get('/chapter/:chapterId', function (request, response) {
    var chapter = db.get('chapters').find({id: request.params.chapterId}).value();
    var word = db.get('words').filter({chapter_id: chapter.id}).value();
    var book = db.get('books').find({id: chapter.book_id}).value();
    var title = '';
    var description = '';
    var list = template.wordlist(word);
    //var sanitizedTitle = sanitizeHtml(topic.title);
    var html = template.HTML(title, '',
      `<br><a href="/book/${book.id}">${book.title}</a> > 
      ${chapter.title}
      ${list}`,
      control.chapterUI(request, response, chapter),
      '' 
    );
    response.send(html)
  })

  app.get('/chapter/update/:chapterId', function (request, response) {
    var chapter = db.get('chapters').find({id:request.params.chapterId}).value();
    var book = db.get('books').find({id: chapter.book_id}).value();
    var title = '';
    var list = '';
    var html = template.HTML(title, list,
      `<br><a href="/book/${book.id}">${book.title}</a> > <b>${chapter.title}</b>
      <form action="/chapter/update_process" method="post">
        <input type="hidden" name="id" value="${chapter.id}">
        <p><input type="text" name="title" placeholder="chapter title" value="${chapter.title}"></p>
        <p><input type="submit" value="update"></p>
      </form>
      `,'',''
    );
    response.send(html);
  })
 
  app.post('/chapter/update_process', function (request, response) {
    var post = request.body;
    var id = post.id;
    var title = post.title;
    db.get('chapters').find({id:id}).assign({title:title}).write();
    response.redirect(`/chapter/${id}`)
  })

  app.post('/chapter/delete_process', function (request, response) {
    // hold !!!!11
    console.log(' !!!!!! need update, check existing word list');
    var post = request.body;
    var id = post.id;
    var book_id = post.book_id
    console.log('id:',id);
    console.log('book_id:',book_id);
    //db.get('chapters').remove({id:id}).write();
    response.redirect(`/book/${post.book_id}`);
  })


 
  app.get('/word/create/:chapterId', function (request, response) {
    var chapter = db.get('chapters').find({id:request.params.chapterId}).value();
    var book = db.get('books').find({id:chapter.book_id}).value();
    var title = 'WEB - create';
    var list = '';
    var html = template.HTML(title, list, `
    <br><a href="/book/${book.id}">${book.title}</a> > <b>${chapter.title}</b>
        <form action="/word/create_process" method="post">
          <input type="hidden" name="chapter_id" value="${chapter.id}">
          <p><input type="text" name="word" placeholder="word"></p>
          <p><textarea name="meaning" placeholder="meaning"></textarea></p>
          <p><input type="submit" value="create word"></p>
        </form>
      `, '', '');
    response.send(html);
  })

  app.post('/word/create_process', function (request, response) {
    var post = request.body;
    var chapter_id = post.chapter_id;
    var word = post.word;
    var meaning = post.meaning;
    var id = shortid.generate();
    db.get('words').push({
      id: id,
      title: word,
      meaning:meaning,
      chapter_id: chapter_id,
    }).write();
    response.redirect(`/chapter/${chapter_id}`);
  })

  // app.get('/static', function(req,res){
  //   fs.readFile('wordlist.txt', (e, data) => {
  //     if (e) throw e;
  //     console.log(data);
  // });
  // });


  app.post('/word/import', upload.single('myfile'), function (request, response) {
    var post = request.body; 
    var chapter_id = post.chapter_id
    var data=request.file.buffer.toString('utf8').trim().split('\r\n')
    //console.log('data',data);
    var i = 0;
    while((data.length) && i < data.length){
      var id = shortid.generate();
      db.get('words').push({
        id: id,
        title: data[i],
        meaning:'',
        chapter_id: chapter_id,
      }).write();
      i=i+1
    }
    response.redirect(`/chapter/${chapter_id}`);
  })

  app.get('/word/:wordId', function (request, response) {
    var word = db.get('words').find({id: request.params.wordId}).value();
    var chapter = db.get('chapters').find({id: word.chapter_id}).value();
    var book = db.get('books').find({id: chapter.book_id}).value();
    var title = '';
    var description = '';
    var list = '';
    //var sanitizedTitle = sanitizeHtml(topic.title);
    var html = template.HTML(title, '',
      `<br><a href="/book/${book.id}">${book.title}</a> > 
      <a href="/chapter/${chapter.id}">${chapter.title}</a> >
      ${word.title}
      <br><br>
      ${word.title} : ${word.meaning} <br>`,
      control.wordUI(request, response, word),
      '' 
    );
    response.send(html)
  })

  app.get('/word/update/:wordId', function (request, response) {
    var word = db.get('words').find({id: request.params.wordId}).value();
    var chapter = db.get('chapters').find({id: word.chapter_id}).value();
    var book = db.get('books').find({id: chapter.book_id}).value();
    var title = '';
    var list = '';
    console.log(word);
    
    var html = template.HTML(title, list,
      `<br><a href="/book/${book.id}">${book.title}</a> > 
      <a href="/chapter/${chapter.id}">${chapter.title}</a> >
      ${word.title}
      <br>
      <form action="/word/update_process" method="post">
          <input type="hidden" name="id" value="${word.id}">
          <input type="hidden" name="chapter_id" value="${word.chapter_id}">
          <p><input type="text" name="title" placeholder="word" value="${word.title}"></p>
          <p><textarea name="meaning" placeholder="meaning">${word.meaning}</textarea></p>
          <p><input type="submit" value="update"></p>
        </form>
      `,'',''
    );
    response.send(html);
  })
 
  app.post('/word/update_process', function (request, response) {
    var post = request.body;
    var id = post.id;
    var chapter_id = post.chapter_id
    var title = post.title;
    var meaning = post.meaning;
    db.get('words').find({id:id}).assign({title:title,meaning:meaning}).write();
    response.redirect(`/chapter/${chapter_id}`)
  })

  app.post('/word/delete_process', function (request, response) {
    var post = request.body;
    var id = post.id;
    var chapter_id = post.chapter_id
    db.get('words').remove({id:id}).write();
    response.redirect(`/chapter/${post.chapter_id}`);
})


  app.get('/topic/list', function (request, response) {
    var title = '';
    var description = '';
    var list = template.list(request.list);
    var html = template.HTML(title, list,
      `<h2>${title}</h2>${description}`,
      auth.topicUI(request, response, request.list),
      ''
    );
    response.send(html)
  })

  app.get('/topic/create', function (request, response) {
    var title = 'WEB - create';
    var list = template.list(request.list);
    var html = template.HTML(title, list, `
        <form action="/topic/create_process" method="post">
          <p><input type="text" name="title" placeholder="title"></p>
          <p><textarea name="description" placeholder="description"></textarea></p>
          <p><input type="submit" value="create"></p>
        </form>
      `, '', ''
      );
    response.send(html);
  })
  
  app.post('/topic/create_process', function (request, response) {
    var post = request.body;
    var title = post.title;
    var description = post.description;
  
    var id = shortid.generate();
    db.get('topics').push({
      id: id,
      title: title,
      description: description,
      user_id: request.user.id
    }).write();
    response.redirect(`/topic/${id}`);
  })
  
  
  app.get('/topic/update/:pageId', function (request, response) {
    var topic = db.get('topics').find({id:request.params.pageId}).value();
    var title = topic.title;
    var description = topic.description;
    var list = template.list(request.list);
    var html = template.HTML(title, list,
      `<form action="/topic/update_process" method="post">
        <input type="hidden" name="id" value="${topic.id}">
        <p><input type="text" name="title" placeholder="title" value="${title}"></p>
        <p><textarea name="description" placeholder="description">${description}</textarea></p>
        <p><input type="submit" value="update"></p>
      </form>
      `,'',''
    );
    response.send(html);
  })
  
  app.post('/topic/update_process', function (request, response) {
    var post = request.body;
    var id = post.id;
    var title = post.title;
    var description = post.description;
    var topic = db.get('topics').find({id:id}).value();
    db.get('topics').find({id:id}).assign({
      title:title, description:description
    }).write();
    response.redirect(`/topic/${topic.id}`)
  })
  
  app.post('/topic/delete_process', function (request, response) {
    var post = request.body;
    var id = post.id;
    var topic = db.get('topics').find({id:id}).value();
    db.get('topics').remove({id:id}).write();
    response.redirect('/');
  })
  
  app.get('/topic/:pageId', function (request, response, next) {
    var topic = db.get('topics').find({
      id: request.params.pageId
    }).value();
    var user = db.get('users').find({
      id: topic.user_id
    }).value();
    
    var sanitizedTitle = sanitizeHtml(topic.title);
    var sanitizedDescription = sanitizeHtml(topic.description, {
      allowedTags: ['h1']
    });
    var list = '';
    var html = template.HTML(sanitizedTitle, list,
      `<h2>${sanitizedTitle}</h2>
      ${sanitizedDescription}
      <p>by ${user.displayName}</p>
      `,
      auth.topicUI(request, response, topic),
      ''
    );
    response.send(html);
  });

app.use(function(req, res, next){
  res.status(404).send('sorry cant find that!')
})

app.use(function(err,req,res,nex){
  console.error(err.stack)
  res.status(500).send('Something broke!')
});

app.listen(3000, function() {
  console.log('Example app listening on port 3000!')
})
