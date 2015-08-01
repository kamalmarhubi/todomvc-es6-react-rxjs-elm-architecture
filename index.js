import {Record, List} from "immutable";
import {FuncSubject} from "rx-react";
import reactMixin from "react-mixin";
import Rx from "rx";
import React from "react/addons";


// Model

//var Model = Record({value: 0});
//
//const inc = model => model.set("value", model.value + 1);
//const Inc = () => inc;
//
//const dec = model => model.set("value", model.value - 1);
//const Dec = () => dec;
//
//const reset = model => 0;
//const Reset = () => reset;

const All = Symbol("All");
const Completed = Symbol("Completed");
const Active = Symbol("Active");

var Model = Record({
    tasks: List(),
    field: "some task",
    nextId: 0,
    visibility: All
});

var Task = Record({
    description: "",
    completed: false,
    editing: false,
    id: null
});

const initialModel = new Model({tasks: List([new Task({description: "hi", id: -1})])});

// Update

const NoOp = model => model;
const UpdateField = value => model => model.set("field", value);
const Add = model => {
    model = model.set("tasks", model.tasks.unshift(new Task({id: model.nextId, description: model.field})));
    model = model.set("nextId", model.nextId + 1);
    model = model.set("field", "");
    return model;
};

// type Action
//     = NoOp
//     | UpdateField String
//     | EditingTask Int Bool
//     | UpdateTask Int String
//     | Add
//     | Delete Int
//     | DeleteComplete
//     | Check Int Bool
//     | CheckAll Bool
//     | ChangeVisibility String

// View

let PureRender = reactMixin.decorate(React.addons.PureRenderMixin);

@PureRender
class Value extends React.Component {
    render() {
        return <div>
            {this.props.model.value}
            <button onClick={() => this.props.actionStream.onNext(Inc())}>+</button>
            <button onClick={() => this.props.actionStream.onNext(Dec())}>-</button>
        </div>;
    }
}

@PureRender
class TaskList extends React.Component {
    render() {
        return <ul>
            {this.props.model.tasks.map(task =>
                    <TaskC key={task.id} description={task.description} />)}
        </ul>;
    }
}

@PureRender
class TaskC extends React.Component {
    render() {
        return <li>{this.props.description}</li>;
    }
}

let withTargetValue = f => evt => f(evt.target.value);

let actionStream = new Rx.BehaviorSubject(NoOp);

let modelStream = actionStream.scan(initialModel, (model, action) => {
    return action(model); });

@PureRender
class App extends React.Component {
    componentWillMount() {
        let {actionStream} = this.props;

        let onAdd = FuncSubject.create()
          , onFieldChange = FuncSubject.create()
        ;

        Rx.Observable.merge(
                onAdd.map(evt => Add),
                onFieldChange.map(evt => UpdateField(evt.target.value)))
            .subscribe(actionStream);

        Object.assign(this, {onAdd, onFieldChange});

        modelStream.subscribe(model => this.setState({model}));
    }
    render() {
        let {actionStream} = this.props;
        let {model} = this.state;
        return <div>
            <input type="text" value={this.state.field} onChange={this.onFieldChange} />
            <button onClick={this.onAdd}>+</button>
            <TaskList model={model} actionStream={actionStream} />
            <pre>{JSON.stringify(model, null, 4)}</pre>
        </div>;
    }
}

React.render(<App actionStream={actionStream} />, document.body);
