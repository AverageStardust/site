import { For, Show, Signal, createEffect, createSignal } from "solid-js";

import { downloadFiles, uploadFiles } from "./firebase";
import { validatePassword } from "./password";
import Status, { StatusState } from "./Status";
import FileViewer from "./FileViewer";
import PasswordInput from "./PasswordInput";
import "./App.css";

export enum AppState {
	Ready,
	Working,
	Uploaded,
	Downloaded
}

export default function App() {
	const [state, setState] = createSignal(AppState.Ready) as Signal<AppState>;
	const [statusState, setStatusState] = createSignal(StatusState.None) as Signal<StatusState>;
	const [statusMessage, setStatusMessage] = createSignal("") as Signal<string>;
	const [password, setPassword] = createSignal(new Array(24)) as Signal<(null | string)[]>;
	const [files, setFiles] = createSignal([] as File[]) as Signal<File[]>;

	const fileInput = document.createElement("input");
	fileInput.type = "file";
	fileInput.multiple = true;

	function runWithStatus(func: () => Promise<unknown>, jobMessage: string, showDone = true) {
		const _state = state();
		setState(AppState.Working);

		setStatusState(StatusState.Pending);
		setStatusMessage(jobMessage);
		func().then(() => {
			if (showDone) {
				setStatusState(StatusState.Resolved);
				setStatusMessage("Done");
			} else {
				setStatusState(StatusState.None);
				setStatusMessage("");
			}
		}, (err: Error) => {
			setStatusState(StatusState.Rejected);
			setStatusMessage(err.message);
			setState(_state);
		});
	}

	function inputFiles() {
		setState(AppState.Ready);
		fileInput.click();
		fileInput.addEventListener("change", () => {
			if (fileInput.files === null) return;
			setFiles([...files(), ...fileInput.files]);
		});
	}

	function spliceFile(file: File, newFile?: File) {
		const _files = Array.from(files());
		const index = _files.findIndex(_file => _file === file);
		if (newFile) _files.splice(index, 1, newFile);
		else _files.splice(index, 1);
		setFiles(_files);
	}

	function setFileName(file: File, name: string) {
		const renamedFile = new File([file], name, { type: file.type });
		spliceFile(file, renamedFile);
	}

	function nameHasSpoiler(name: string) {
		return name.startsWith("||") && name.endsWith("||");
	}

	function toggleFileSpoiler(file: File) {
		if (nameHasSpoiler(file.name)) {
			setFileName(file, file.name.slice(2, -2));
		} else {
			setFileName(file, "||" + file.name + "||");
		}
	}

	return <>
		<PasswordInput password={password} setPassword={setPassword}
			disabled={() => state() !== AppState.Ready}></PasswordInput>
		<div class="network-section">
			<button class="network-button" onClick={() => runWithStatus(
				async () => {
					setFiles(await downloadFiles(password()));
					setState(AppState.Downloaded);
				}, "Downloading", false)}
				disabled={
					files().length > 0 ||
					state() !== AppState.Ready ||
					!validatePassword(password())}
			>{state() === AppState.Downloaded ? "Downloaded" : "Download"}</button>
			<button class="network-button" onClick={() => runWithStatus(
				async () => {
					setPassword(await uploadFiles(files()));
					setState(AppState.Uploaded);
				}, "Uploading", true)}
				disabled={
					files().length === 0 ||
					state() !== AppState.Ready}
			>{state() === AppState.Uploaded ? "Uploaded" : "Upload"}</button>
		</div >
		<hr></hr>
		<Status state={statusState} message={statusMessage}></Status>
		<For each={files()}>{(file, index) =>
			<FileViewer file={() => files()[index()]}
				hasSpoiler={() => nameHasSpoiler(files()[index()].name)}
				removeDisabled={() => state() !== AppState.Ready}
				toggleSpoiler={() => toggleFileSpoiler(files()[index()])}
				removeFile={() => spliceFile(files()[index()])}></FileViewer>
		}</For>
		<Show when={state() === AppState.Ready}>
			<button class="add-file-button" onClick={inputFiles}>+</button>
		</Show>
	</>
}