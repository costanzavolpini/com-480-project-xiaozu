const express = require('express');
const bodyParser= require('body-parser');
const session = require('express-session');
const path = require('path');
var mongoose = require("mongoose");
const dotenv = require('dotenv');
dotenv.config();


models = require("./models");
students = require("./models/student")
enrollments = require("./models/enrollment")
courses = require("./models/course")
teachers = require("./models/teacher")
jaccard = require("./models/jaccard")
course_network = require("./models/course_network")

course_enroll = require("./models/course_enroll")
course_prof = require("./models/course_prof")
course_stats = require("./models/course_stats")
section = require("./models/course_bubble")


var app = express();
const router = express.Router();


// Register model definition here
app.listen(process.env.PORT || 3000, function() {
  console.log('listening on 3000')
})

app.use(
  bodyParser.urlencoded({ extended: true })
);

// app.use('/app', express.static(__dirname + "/app"));
app.use('/app', express.static(__dirname + '/app'));

app.use("/", router);

// HANDLERS (e.g. GET, POST requests)
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html'),
    res.sendFile(__dirname + '/index.html')
})

// Database
const url = process.env.MONGO;
mongoose.connect(url, {useUnifiedTopology: true, useNewUrlParser: true, dbName: 'EPFL'});

const connection = mongoose.connection;

connection.once("open", function() {
  console.log("MongoDB database connection established successfully");
});

// Routes query
router.route("/students").get(function(req, res) {
  students.find({}, function(err, result) {
    if (err) {
      res.send(err);
    } else {
      res.send(result);
    }
  });
});

// Enrollments
router.route("/enrollments").get(function(req, res) {
  enrollments.find({}, function(err, result) {
    if (err) {
      res.send(err);
    } else {
      res.send(result);
    }
  });
});

// Jaccard
router.route("/jaccard").get(function(req, res) {
  jaccard.find({}, function(err, result) {
    if (err) {
      res.send(err);
    } else {
      res.send(result);
    }
  });
});

router.get("/enrollments/:studid", function(req, res) {
	let filter = {};

	if (req.params.studid) {
		filter.student_id = req.params.studid;
  }

	enrollments.find(filter, function(err, found) {
		if ((err) || (!found))
			return res.sendStatus(404);
		res.json(found);
	});
});

// Teacher
router.route("/teachers").get(function(req, res) {
  teachers.find({}, function(err, result) {
    if (err) {
      res.send(err);
    } else {
      res.send(result);
    }
  });
});

function query_course_network(course_lst, res) {
  // Check for all connection involving those nodes
  course_network.aggregate([ // Q1
    { $match : { course_name_x : {$in: course_lst}} }
  ]).exec(
      function(err, result) {
        if (err) {
          res.send(err);
        } else {

          // Init empty list of nodes
          nodes = []

          // Populate the nodes with the results for the original nodes of Q0
          map_nodes_to_idx = {}
          for(i in course_lst){
            nodes[nodes.length] = {"id": i, "name": course_lst[i], "taken": 1}
            map_nodes_to_idx[course_lst[i]] = i
          }

          // Init empty list of links
          links = []

          // Populate the links
          for(i in result){

            course_name_x = result[i].course_name_x
            course_name_y = result[i].course_name_y

            // Populate the nodes with the results for the neighbours nodes (Q1)
            if(!course_lst.includes(course_name_y)){
              course_lst[course_lst.length] =  course_name_y
              nodes[nodes.length] = {"id": course_lst.length, "name": course_name_y, "taken": 0,
                                      "short_name": result[i].short_name_y}
              map_nodes_to_idx[course_name_y] = course_lst.length
            }

            if(result[i].short_name_x) {
              var idx = course_lst.indexOf(course_name_x)
              nodes[idx] = {"id": nodes[idx].id, "name": nodes[idx].name, "taken": nodes[idx].taken,
                              "short_name": result[i].short_name_x}
            }

            // Adding the connection to the list of edges of the network
            links[links.length] = {
              "source": map_nodes_to_idx[result[i].course_name_x],
              "target": map_nodes_to_idx[course_name_y],
              "value": Math.max(1, Math.round(result[i].jaccard * 10))
            };
          }
          res.send({ "nodes": nodes, "links": links})
        }
      }
  );
}

router.route("/course_network").get(function(req, res) {
  // Build the personal graph for a specific student
  // If student is not specified return an error
  if (!req.query.student && !req.query.courses) {
    res.send("Please specify the student (e.g., url/course_network/?student=Rocchi%20Eleonora");
  }
  if(req.query.student) {
    students.aggregate([ // Q0
      { $match : { student_name : req.query.student } },

      // Join with enrollment tableover student_id
      { $lookup: { from: "enrollment", localField: "student_id", foreignField: "student_id", as: "from_course"} },
      { $unwind: "$from_course"},
      { $replaceRoot: { newRoot: { $mergeObjects: "$from_course" } }},

      // Join with course table over course_id
      { $lookup: { from: "course", localField: "course_id", foreignField: "course_id", as: "course" }},
      { $unwind: "$course"},
      { $replaceRoot: { newRoot: { $mergeObjects: "$course" } }},
      { $project : { "course_name": 1 } }
    ]).exec(
        function(err, course_names) {
          if (err) {
            res.send(err);
          } else {
            // Obtain a list of course names in which we are interested
            course_lst = Array.from(new Set(course_names.map(d => d.course_name)))
            query_course_network(course_lst, res)
          }
        }
    );
  }
  else {
    query_course_network(req.query.courses.split("$"), res);
  }

});

router.route("/courses").get(function(req, res) {
  //TODO: change it, we should be able to return all courses when we do /courses or just courses of a student whenever
  // the student is specified
  // Choose the student of which you want to return the courses
  // http://localhost:3000/courses/?student=Rocchi%20Eleonora
  if (!req.query.student) {
    res.send("Please specify the numbers of courses (e.g., url/courses/?student=Rocchi%20Eleonora")
  }
  // select students set from course name
  students.aggregate([
    { $match : { student_name : req.query.student } },
    { $lookup: { from: "enrollment", localField: "student_id", foreignField: "student_id", as: "from_course"} },
    { $unwind: "$from_course"},
    { $replaceRoot: { newRoot: { $mergeObjects: "$from_course" } }},
    { $lookup: { from: "course", localField: "course_id", foreignField: "course_id", as: "course" }},
    { $unwind: "$course"},
    { $replaceRoot: { newRoot: { $mergeObjects: "$course" } }},
    { $project : { "course_name": 1 } }
  ]).exec(
      function(err, result) {
        if (err) {
          res.send(err);
        } else {
          res.send(result)
        }
      }
  );
});

router.route("/course_bubble").get(function(req, res) {
  // just for us --> to generate file for db
  // if (!req.query.section || !req.query.year) {
  //   res.send("Please specify the numbers of courses and the academic year (e.g., url/top_courses/?max=5&year=2008-2009)")
  // }
  // from 2015 - 2020 extract:
  // 2014-2015, 2015-2016, 2016-2017, 2017-2018, 2018-2019, 2019-2020, 2020-2021
  var list_years = [];
  for (var i = 2004; i <= 2020; i++) {
    list_years.push(i.toString());
  }
  // if (!req.query.section) {
  //   res.send("Please specify the section")}
  // }  // 1. group e assegnare un count ad ogni enrollment, poi 2. join con courses e dopo di che
  // 3. filter by year e ordinare tutto a seconda del count trovato prima e dopo
  // fare limit (#maxcourses)
  //TODO: check names and delete the smallest one in case of repetition of same name!
  section.aggregate([
     // { $match : {  section : req.query.section }},
    { $match: { year: req.query.year } },
  ]
).exec(
      function(err, result) {
        if (err) {
          res.send(err);
        } else {
          res.send(result)
          }
      }
  );
});


router.route("/course_prof").get(function(req, res) {
  if (!req.query.course_name) {
    res.send("Please specify the numbers of courses (e.g., url/course_prof/?course_name=Machine%20learning)")
  }
  course_prof.find({"course_name" : req.query.course_name}, function(err, result) {
    if (err) {
      res.send(err);
    } else {
      res.send(result);
    }
  });

});

router.route("/course_stats").get(function(req, res) {
  if (!req.query.course_name || !req.query.year || !req.query.major) {
    res.send("Please specify the numbers of courses (e.g., url/course_stats/?course_name=Machine%20learning&year=cumulative&major=0)")
  }
  if(req.query.year == "cumulative"){
    if(req.query.major == "0"){
      course_stats.aggregate([
        { $match: { course_name : req.query.course_name } },
        { $group: { _id : "$year", nr_students: { $sum: "$nr_students" } } },
        { $addFields : {"year": "$_id"} }
      ]).exec(function(err, result) {
        if (err) {
          res.send(err);
        } else {
          res.send(result);
        }
      })
    }
    else {
      course_stats.aggregate([
        { $match: { course_name : req.query.course_name } },
        // adding number of students over different semester (MA1, MA2 etc.)
        { $group: { _id : "$section", nr_students: { $sum: "$nr_students" } } },
        { $addFields : {"major": "$_id"} }
      ]).exec(function(err, result) {
        if (err) {
          res.send(err);
        } else {
          res.send(result);
        }
      });
    }
  }
  else {
    course_stats.aggregate([
      { $match: { course_name : req.query.course_name } },
      { $match: { year : req.query.year } },
      // adding number of students over different semester (MA1, MA2 etc.)
      { $group: { _id : "$section", nr_students: { $sum: "$nr_students" } } },
      { $addFields : {"major": "$_id"} }
    ]).exec(function(err, result) {
      if (err) {
        res.send(err);
      } else {
        res.send(result);
      }
    });
  }
});


router.route("/top_courses").get(function(req, res) {
  // http://localhost:3000/top_courses/?max=5&year=2008-2009
  if (!req.query.max || !req.query.year) {
    res.send("Please specify the numbers of courses and the academic year (e.g., url/top_courses/?max=5&year=2008-2009)")
  }
  top_N_courses = +req.query.max;
  ay = req.query.year
  // 1. group e assegnare un count ad ogni enrollment, poi 2. join con courses e dopo di che
  // 3. filter by year e ordinare tutto a seconda del count trovato prima e dopo
  // fare limit (#maxcourses)
  course_enroll.aggregate([
    { // filter by date (some data have space etc)
      $match: {
        $expr: {
          $gt: [
            {
                $indexOfBytes: [
                  "$year",
                    ay
                ]
            },
            -1
          ]
        }
     }
    },
   { $sort : {"count" : -1 } }, //need to find a solution, sort it is extremely slow!
  ]
).limit(top_N_courses)
  .exec(
      function(err, result) {
        if (err) {
          res.send(err);
        } else {
          // Sum enrollments of courses of same name
          // sort and then limit

          // console.log(result)
          res.send(result)
          }
      }
  );
});

router.route("/courses_related").get(function(req, res) {
  // Pick the courses that are most related to 'course' (at most 'max')
  // http://localhost:3000/courses_related/?course=Machine%20learning&max=20
  if (!req.query.course || !req.query.max) {
    res.send("Please specify the numbers of courses (e.g., url/courses_related/?course=Machine%20learning&max=20)")
  }

  jaccard.aggregate([
    { $match : { course_name : req.query.course } },
    { $lookup: { from: "jaccard", pipeline: [], as: "courses" } },

  ]).exec(
      function(err, result) {
        if (err) {
          res.send(err);
        } else {
          var lst = []
          var students = new Set(result[0].set.substring(1, result[0].set.length - 1).split(","))
          for(var c in result[0].courses){
            var tmp = result[0].courses[c].set;
            tmp = tmp.substring(1, tmp.length - 1).split(",");
            var count = 0;
            for(var s in tmp){
              if(students.has(tmp[s])){
                count += 1
              }
            }
            var jj = count / (students.size + tmp.length - count)
            if(jj > 0){
              lst[lst.length] = [jj, result[0].courses[c].course_name]
            }
          }
          var most_related = lst.sort(function(a, b){return b[0]-a[0]}).slice(1, +req.query.max + 1) //TODO

          most_related_courses = [req.query.course]
          for(i in most_related){
            most_related_courses[most_related_courses.length] = most_related[i][1]
          }
          jaccard.aggregate([
            {$match :{ course_name : {"$in": most_related_courses }}}
          ]).exec(
            function(err, result2) {
              if (err) {
                res.send(err);
              } else {
                var courseConnections = []
                for(c1 in result2){
                  name1 = result2[c1].course_name
                  connections = []
                  s1 = result2[c1].set
                  s1 = s1.substring(1, s1.length - 1).split(",")
                  for(c2 in result2){
                    name2 = result2[c2].course_name;
                    jaccard_coeff = 1;
                    s2 = result2[c2].set
                    s2 = s2.substring(1, s2.length - 1).split(",")
                    commons = s1.filter(value => -1 !== s2.indexOf(value))
                    connections[connections.length] = {}
                    connections[connections.length - 1][name2] =  commons.length / (s1.length + s2.length - commons.length)
                  }
                  courseConnections[courseConnections.length] = {"name" : name1, "connects" : connections}
                }
                res.send(courseConnections)
              }
            }
          );
        }
      }
  );
});
