import { inject, observer } from "mobx-react";
import React from "react";
import styled from "styled-components";
import { taskToLSFormat } from "../../sdk/lsf-utils";
import { Spinner } from "./Spinner";

const wait = (timeout) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

class PreviewGenerator {
  static getInstance(labelingConfig) {
    if (this._instance) return this._instance;

    return (this._instance = new PreviewGenerator(labelingConfig));
  }

  constructor(labelingConfig) {
    this.loaded = false;
    this.running = false;
    this.queue = [];

    this.root = document.querySelector(".offscreen-lsf");

    this.lsf = new window.LabelStudio(this.root, {
      user: { id: 1 },
      interfaces: [],
      config: labelingConfig ?? "",
      onLabelStudioLoad: () => {
        this.loaded = true;
        this.startQueue();
      },
    });
  }

  generatePreview(task, completion) {
    return new Promise((resolve) => {
      this.queue.push({
        task,
        completion,
        resolve,
      });

      this.startQueue();
    });
  }

  async startQueue() {
    if (this.loaded === false) return;
    if (this.running === true) return;
    if (this.queue.length === 0) return;

    this.running = true;
    await this.processJob();
    this.running = false;
  }

  async processJob() {
    const { task: taskRaw, completion, resolve } = this.queue.shift();

    const task = {
      id: taskRaw.id,
      completions: taskRaw.completions,
      predictions: taskRaw.predictions,
      data: taskRaw.data,
    };

    this.lsf.resetState();
    this.lsf.assignTask(task);
    this.lsf.initializeStore(taskToLSFormat(task));
    this.lsf.completionStore.selectCompletion(completion.pk ?? completion.id);

    await wait(1500);
    const preview = await this.createPreviews(5);

    resolve(preview);

    if (this.queue.length) {
      await this.processJob();
    }
  }

  async createPreviews(attempts) {
    if (attempts === 0) return;

    try {
      return this.lsf.completionStore.selected.generatePreviews();
    } catch (err) {
      await wait(1000);
      return this.createPreviews(attempts - 1);
    }
  }
}

const injector = inject(({ store }) => {
  return {
    labelingConfig: store?.labelingConfig,
  };
});

const PreviewPlaceholder = styled.div`
  width: ${({ width }) => width ?? "100%"};
  height: ${({ height }) => height ?? "100%"};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
`;

export const AnnotationPreview = injector(
  observer(({ labelingConfig, name, task, completion, style, ...props }) => {
    const generator = React.useMemo(() => {
      if (labelingConfig) return PreviewGenerator.getInstance(labelingConfig);
    }, [labelingConfig]);

    const [preview, setPreview] = React.useState(null);
    const variant = props.variant ?? "original";

    React.useEffect(() => {
      if (preview !== null) return;

      const start = async () => {
        if (generator && task && completion) {
          const preview = await generator.generatePreview(task, completion);
          setPreview(preview);
        }
      };

      start();
    }, [task, completion, generator, preview]);

    return preview ? (
      <img
        src={preview[`$${name}`][variant]}
        alt=""
        style={style}
        width={props.width}
        height={props.height}
      />
    ) : (
      <PreviewPlaceholder
        fallback={props.fallbackImage}
        width={props.width}
        height={props.height}
      >
        <Spinner
          size={props.size ?? "default"}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate3d(-50%, -50%, 0)",
            zIndex: 100,
          }}
        />
        <img
          src={props.fallbackImage}
          style={{ ...(style ?? {}), opacity: 0.5 }}
          alt=""
          width={props.width}
          height={props.height}
        />
      </PreviewPlaceholder>
    );
  })
);
