import {Record, List} from "immutable";
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


// Update

const NoOp = () => model => model;
const UpdateField = evt => model => model.set("field", evt.target.value);
const Add = () => model => {
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

@PureRender
class App extends React.Component {
    static defaultProps = { model: 0 };
    render() {
        return <div>
            <input type="text" value={this.props.model.field} onChange={ev =>
                this.props.actionStream.onNext(model => model.set("field", ev.target.value))}
                        />
            <button onClick={() => this.props.actionStream.onNext(Add())}>+</button>
            <TaskList model={this.props.model} actionStream={actionStream} />
            <pre>{JSON.stringify(this.props.model.toJS())}</pre>
        </div>;
    }
}

const initialModel = new Model({tasks: List([new Task({description: "hi", id: -1})])});
let actionStream = new Rx.Subject();
let modelStream = actionStream.scan(initialModel, (model, action) => {
    return action(model); })
    .startWith(initialModel);

//actionStream.subscribe(x => console.log(x));

modelStream.subscribe(
        newProps => React.render(<App model={newProps} actionStream={actionStream} />, document.body));


//React.render(<App />, document.body);
