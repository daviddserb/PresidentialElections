console.log("##### se intra in db/users.js");

const db_connection = require('./connection.js');
const createConnection = db_connection.createConnection();
const connection = createConnection[0];
const appRunOn = createConnection[1];

function registerUser(name, email, password) {
    console.log("##### registerUser()");
    connection.query("INSERT INTO users(name, email, password)" +
    "VALUES ('"+ name +"', '"+ email +"', '"+ password +"')", function(err) {
        if (err) {
            console.log("return false");
            console.log(false);
            return false;
        } else {
            console.log("return true");
            return true;
        }
    });
}

function loginUser(email, password) {
    console.log("##### se intra in loginUser()");
    connection.query(`SELECT * FROM users WHERE email = '${email}' && password = '${password}'`, function(err, rows) {
        if (rows[0] == undefined) {
            console.log(rows);
            console.log(rows[0]);
            return false;
        } else {
            return true;
        }
    });
}

function startElections(startPresidency, stopPresidency) {
    console.log("##### se intra in startElections()");
    connection.query("INSERT INTO elections (start, stop)" +
    "VALUES ('"+  startPresidency +"', '"+ stopPresidency +"')", (err) => {
        if (err) {
            return err;
        } else {
            return true;
        }
    });
}

function runForPresident(loggedInUserName) {
    console.log("##### se intra in runForPresident()");
    connection.query(`SELECT * FROM elections ORDER BY id DESC LIMIT 1`, function(err, rows) {
        if (err) {
            return err;
        } else {
            let lastPresidency = rows[0];
            console.log(lastPresidency);

            if (lastPresidency.start <= new Date() && new Date() <= lastPresidency.stop) {
                connection.query("INSERT INTO candidates(nr_election, candidate)" +
                "VALUES ('"+ lastPresidency.id +"', '"+ loggedInUserName +"')", (err) => {
                    if (err) {
                        return err;
                    } else {
                        return true;
                    }
                });
            } else {
                return false;
            }
        }
    });
}

function presidentList(loggedInUserName) {
    console.log("##### se intra in presidentList()");
    //select the start and stop date of the last election
    connection.query(`SELECT * FROM elections ORDER BY id DESC LIMIT 1`, function(err, rows) {
        if (err) {
            return err;
        } else {
            console.log("new Date():")
            console.log(new Date());
            let lastPresidency = rows[0];
            console.log("lastPresidency");
            console.log(lastPresidency);
            let lastPresidencyStart = lastPresidency.start.toISOString().replace(/T/, ' ').replace(/\..+/, '');
            let lastPresidencyStop = lastPresidency.stop.toISOString().replace(/T/, ' ').replace(/\..+/, '');
            console.log("lastPresidency.start");
            console.log(lastPresidencyStart);
            console.log("lastPresidency.stop");
            console.log(lastPresidencyStop);

            //check if the election did end
            if (new Date() > lastPresidency.stop) {
                return false;
            } else {
                //select all candidates
                connection.query(`SELECT candidate FROM candidates`, function(err, rows) {
                    if (err) {
                        return err;
                    } else {
                        console.log("\nrows: (candidates)");
                        console.log(rows)

                        //calculate votes
                        connection.query(`SELECT elected, COUNT(elected) as votes FROM votes WHERE '${lastPresidencyStart}' <= vote_date && vote_date <= '${lastPresidencyStop}' GROUP BY elected`, function (err, result) {
                            if (err) {
                                return err;
                            } else {
                                return result;
                            }
                        });
                    }
                });
            }
        }
    });
}

function vote(userNameElected, userNameVoter) {
    console.log("##### se intra in vote()");
    connection.query(`SELECT vote_date FROM votes WHERE voter = '${userNameVoter}' ORDER BY id DESC LIMIT 1`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            let presentDate = new Date(new Date() + "UTC");
            let userNameVoter_LastTimeHeVoted;
            let userNameVoter_LastTimeHeVoted_AfterADay;

            if (rows[0] == undefined) { //when the user who wants to vote, never voted once before
                userNameVoter_LastTimeHeVoted = "never";
            } else {
                userNameVoter_LastTimeHeVoted = rows[0].vote_date;
                userNameVoter_LastTimeHeVoted_AfterADay = userNameVoter_LastTimeHeVoted;
                userNameVoter_LastTimeHeVoted_AfterADay.setDate(userNameVoter_LastTimeHeVoted_AfterADay.getDate() + 1)
                
                console.log("userNameVoter_LastTimeHeVoted_AfterADay:");
                console.log(userNameVoter_LastTimeHeVoted_AfterADay);
                console.log("presentDate:");
                console.log(presentDate);
            }

            if (userNameVoter_LastTimeHeVoted == "never" || userNameVoter_LastTimeHeVoted_AfterADay < presentDate) {
                connection.query("INSERT INTO votes (voter, elected, vote_date)" +
                "VALUES ('"+  userNameVoter +"', '"+ userNameElected +"', CURRENT_TIMESTAMP)", (err) => {
                    if (err) {
                        throw err;
                    } else {
                        if (appRunOn == "localhost") {
                            res.redirect(`http://localhost:3000/users/president/list`);
                        } else {
                            res.redirect(`https://presidential--elections.herokuapp.com/users/president/list`);
                        }
                    }
                });
            } else {
                req.flash('message', 'You can only vote once per day.');
                res.redirect('../../pop-up-message');
            }
        }
    });
}

function votesHistory(userNameVoter) {
    console.log("##### se intra in votesHistory()");
    connection.query(`SELECT * FROM votes WHERE voter = '${userNameVoter}'`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            let usersNameVoted = [], datesOfVote = [];
            for (let i = 0; i < rows.length; ++i) {
                usersNameVoted[i] = rows[i].elected;
                datesOfVote[i] = rows[i].vote_date;
            }
            console.log("usersNameVoted");
            console.log(usersNameVoted);
            console.log("datesOfVote");
            console.log(datesOfVote);
            connection.query(`SELECT * FROM elections`, function(err, rows) {
                if (err) {
                    throw err;
                } else {
                    let allPresidencies = rows;
                    console.log("allPresidencies");
                    console.log(allPresidencies);
                    res.render('votesHistory', {registeredUserName: userNameVoter, usersNameVoted: usersNameVoted, date : datesOfVote, allPresidencies: allPresidencies, appRunOn : appRunOn});                }
            });
        }
    });
}

//helper functions
function selectCandidates() {
    console.log("+++ se intra in selectCandidates()")
    connection.query(`SELECT * FROM candidates`, function(err, rows) {
        if (err) {
            throw err;
        } else {
            let candidates = [];
            //console.log("rows:")
            //console.log(rows);
            for (let i = 0; i < rows.length; ++i) {
                candidates[i] = rows[i].candidate;
            }
            console.log("candidates:");
            console.log(candidates);
            console.log(candidates.length);
            return candidates;
        }
    });
}

module.exports = {registerUser, loginUser, startElections, runForPresident, presidentList, vote, votesHistory, selectCandidates};