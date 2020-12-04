import { Button, Dropdown, Menu } from "antd";
import { observer } from "mobx-react";
import React from "react";
import { RiErrorWarningFill } from "react-icons/ri";

const ErrorRenderer = (error, i) => {
  return (
    <Menu.Item key={i} disabled={true}>
      {error.response?.detail}
    </Menu.Item>
  );
};

export const ErrorBox = observer(({ errors }) => {
  return errors?.size > 0 ? (
    <Dropdown
      overlay={<Menu>{Array.from(errors.values()).map(ErrorRenderer)}</Menu>}
    >
      <Button
        type="text"
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0 10px",
          fontSize: 12,
        }}
      >
        <RiErrorWarningFill
          color="#ff5a46"
          size={18}
          style={{ marginRight: 5 }}
        />
        Errors occurred
      </Button>
    </Dropdown>
  ) : null;
});