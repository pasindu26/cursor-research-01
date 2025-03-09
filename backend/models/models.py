# models.py

class User:
    def __init__(self, id, firstname, lastname, username, password, email, user_type):
        self.id = id
        self.firstname = firstname
        self.lastname = lastname
        self.username = username
        self.password = password
        self.email = email
        self.user_type = user_type

    def __repr__(self):
        return f'<User {self.username}>'
