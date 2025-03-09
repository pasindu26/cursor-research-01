# forms.py
from wtforms import Form, FloatField, StringField, validators

class DataForm(Form):
    ph_value = FloatField('pH Value', [validators.InputRequired()])
    temperature = FloatField('Temperature', [validators.InputRequired()])
    turbidity = FloatField('Turbidity', [validators.InputRequired()])
    location = StringField('Location', [validators.InputRequired()])
    time = StringField('Time', [validators.InputRequired()])
    date = StringField('Date', [validators.InputRequired()])
