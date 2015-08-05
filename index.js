import {Record, List} from "immutable";
import {FuncSubject} from "rx-react";
import reactMixin from "react-mixin";
import Rx from "rx";
import React from "react/addons";


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
const Clear = model => model.set("tasks", new List());
const Delete = id => model => model.set("tasks", model.tasks.delete(model.tasks.findIndex(t => t.id === id)));
const DeleteComplete = model => model.set("tasks", model.tasks.filterNot(task => task.completed));
const Check = (id, bool) => model => model.set("tasks", model.tasks.map(t => t.id === id ? t.set("completed", bool) : t));
const CheckAll = bool => model => model.set("tasks", model.tasks.map(t => t.set("completed", bool)));
const ChangeVisibility = visibility => model => model.set("visibility", visibility);


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

let vizCheck = viz => {
    if (viz === All) { return t => t; }
    else if (viz === Completed) { return t => t.completed; }
    else return t => !t.completed;
}

@PureRender
class TaskList extends React.Component {
    render() {
        let {dispatcher, tasks, visibility} = this.props;
        return <ul>
            {tasks.filter(vizCheck(visibility)).map(task =>
                <TaskC
                    key={task.id}
                    description={task.description}
                    id={task.id} dispatcher={dispatcher} 
                    completed={task.completed} />)}
        </ul>;
    }
}

@PureRender
class TaskC extends React.Component {
    componentWillMount() {
        let {dispatcher, id} = this.props;
        this.onDelete = dispatcher.dispatch(magicMap(() => Delete(id)));
        this.onCheck = dispatcher.dispatch(magicMap(evt => Check(id, !this.props.completed)));
    }
    render() {
        return <li>
            <input type="checkbox" checked={this.props.completed} onChange={this.onCheck} />
            <button onClick={this.onDelete}>x</button> {this.props.description}
        </li>;
    }
}

class Dispatcher {
    actionStream = new Rx.BehaviorSubject(NoOp);
    modelStream = this.actionStream.scan(initialModel, (model, action) => { return action(model); });
    set rootComponent(component) {
        this._rootComponent = component;
        this._subscription = this.modelStream.subscribe(new RenderObserver(this._rootComponent));
    }
    dispatch(fn) {
        let s = FuncSubject.create();
        fn(s).subscribe(this.actionStream);
        return s;
    }
    dispose() {
        this.subscription.dispose();
    }
}

let magicMap = f => obs => obs.map(f);
let withTargetValue = f => evt => f(evt.target.value);

let dispatcher = new Dispatcher();

class RenderObserver {
    constructor(component) {
        this.component = component;
    }

    onNext(model) {
        this.component.setState({model});
    }
}

@PureRender
class App extends React.Component {
    componentWillMount() {
        let {dispatcher} = this.props;
        this.onAdd = dispatcher.dispatch(magicMap(() => Add));
        this.onClear = dispatcher.dispatch(magicMap(() => Clear));
        this.onDeleteComplete = dispatcher.dispatch(magicMap(() => DeleteComplete));
        this.onCheckAll = dispatcher.dispatch(magicMap(() => CheckAll(!this.state.model.tasks.every(t => t.completed))));
        this.onFieldChange = dispatcher.dispatch(magicMap(withTargetValue(UpdateField)));
        this.onChangeVisibilityAll = dispatcher.dispatch(magicMap(() => ChangeVisibility(All)));
        this.onChangeVisibilityCompleted = dispatcher.dispatch(magicMap(() => ChangeVisibility(Completed)));
        this.onChangeVisibilityActive = dispatcher.dispatch(magicMap(() => ChangeVisibility(Active)));
        dispatcher.rootComponent = this;
    }
    render() {
        let {dispatcher} = this.props;
        let {model} = this.state;
        let allCompleted = model.tasks.every(t => t.completed);
        return <div>
            <input type="checkbox" checked={allCompleted} onChange={this.onCheckAll} />
            <button onClick={this.onClear}>Clear list</button>
            <button onClick={this.onDeleteComplete}>Clear completed</button>
            <input type="text" value={model.field} onChange={this.onFieldChange} />
            <button onClick={this.onAdd}>+</button>
            <TaskList tasks={model.tasks} dispatcher={dispatcher} visibility={model.visibility}/>
            <button onClick={this.onChangeVisibilityAll}>all</button>
            <button onClick={this.onChangeVisibilityCompleted}>completed</button>
            <button onClick={this.onChangeVisibilityActive}>active</button>
            <pre>{JSON.stringify(model, null, 4)}</pre>
        </div>;
    }
    componentWillUnmount() {
        this.modelSubscription.dispose();
        this.modelSubscription = null;
    }

}

React.render(<App dispatcher={dispatcher} />, document.body);
